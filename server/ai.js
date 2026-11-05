// AI chatbot: sends the student's question, the recent conversation, our instructions
// (server/ai-instructions.md) and our knowledge files (knowledge/*.md) to an AI model.
//
// Works with any provider that offers an OpenAI-compatible Chat Completions API
// (Google Gemini, Groq, Ollama, OpenRouter, ...). Set them up in server/.env:
//   main AI:   AI_BASE_URL,        AI_API_KEY,        AI_MODEL
//   backup AI: AI_BACKUP_BASE_URL, AI_BACKUP_API_KEY, AI_BACKUP_MODEL
// The main AI is tried first, then the backup AI. If both fail (or none is set up),
// chatbot.js falls back to the rule-based answers.
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const INSTRUCTIONS_FILE = path.join(__dirname, "ai-instructions.md");
const KNOWLEDGE_DIR = path.join(__dirname, "..", "knowledge");
const SITE_DIR = path.join(__dirname, "..", "site");
const LANG_NAMES = { en: "English", zh: "Chinese (Simplified)", ms: "Malay" };

// Providers in the order they are tried. A provider is skipped if its settings are incomplete
// (an API key is required unless the AI runs on this computer, e.g. Ollama).
function providers() {
  const env = process.env;
  return [
    { name: "main", baseUrl: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: env.AI_MODEL },
    { name: "backup", baseUrl: env.AI_BACKUP_BASE_URL, apiKey: env.AI_BACKUP_API_KEY, model: env.AI_BACKUP_MODEL },
  ].filter(p => p.baseUrl && p.model && (p.apiKey || /\/\/(localhost|127\.0\.0\.1)[:/]/.test(p.baseUrl)));
}

function isConfigured() {
  return providers().length > 0;
}

// For /api/health: which models are set up, e.g. ["main: gemini-flash-lite-latest", "backup: openai/gpt-oss-120b"]
function describe() {
  return providers().map(p => `${p.name}: ${p.model}`);
}

// Which website pages to send for each type of question (intent codes from chat_intents).
// Admission and application facts are already in knowledge/, so those pages are not repeated.
// Free AI plans limit how much text can be sent per minute, so only relevant pages are sent.
const INTENT_PAGES = {
  fees: ["fees.html"],
  scholarship: ["scholarship.html"],
  student_life: ["student-life.html"],
  acceptance: ["fees.html"],
};
// Pages never sent: login/sign-up have no information, and the others are already covered
// by the files in knowledge/ (update knowledge/ when these pages change).
const NO_INFO_PAGES = ["login.html", "signup.html", "index.html", "admission.html", "application.html", "faq.html"];

// The text of the chosen website pages, so the AI knows what they say (fees, scholarships,
// student life, ...). Teammates' updates to these pages are picked up automatically.
function readSitePages(names) {
  return [...new Set(names)]
    .filter(name => /^[\w-]+\.html$/.test(name) && !NO_INFO_PAGES.includes(name) && fs.existsSync(path.join(SITE_DIR, name)))
    .map(name => {
      const text = fs.readFileSync(path.join(SITE_DIR, name), "utf8")
        .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<\/(h[1-6]|p|li|tr|div|section|article)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
      return `<page file="${name}">\n${text}\n</page>`;
    })
    .join("\n\n");
}

// Read the files on every request, so edits take effect without restarting the server.
// pages: the website pages relevant to this question (see pagesFor).
function buildSystemPrompt(pages) {
  const instructions = fs.readFileSync(INSTRUCTIONS_FILE, "utf8").trim();
  const files = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(name => name.endsWith(".md") || name.endsWith(".txt"))
    .sort();
  const knowledge = files
    .map(name => `<file name="${name}">\n${fs.readFileSync(path.join(KNOWLEDGE_DIR, name), "utf8").trim()}\n</file>`)
    .join("\n\n");
  const pageText = readSitePages(pages);
  return `${instructions}\n\n<knowledge_base>\n${knowledge}\n</knowledge_base>` +
    (pageText ? `\n\n<website_pages>\n${pageText}\n</website_pages>` : "");
}

// The current page plus the pages linked to the question's topic.
function pagesFor(currentPage, intent) {
  return [currentPage, ...(INTENT_PAGES[intent] || [])].filter(Boolean);
}

async function callProvider(p, messages) {
  const headers = { "Content-Type": "application/json" };
  if (p.apiKey) headers.Authorization = `Bearer ${p.apiKey}`;
  const res = await fetch(`${p.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: p.model, messages, max_tokens: 1000 }),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS) || 30000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("empty answer");
  // Some models repeat the language rule at the end (e.g. "[Language: Chinese]"); remove it.
  return text.replace(/\n+\s*\[?(reply )?language:?[^\n]*\]?\s*$/i, "").trim();
}

// history: earlier turns [{ role: "user" | "assistant", content: "..." }], already validated.
// lang: reply language; sure = false means it is only the website's language, so the AI
// should prefer the language the student actually wrote in.
// page: the page the student is on (e.g. "fees.html"), so "this page" questions make sense.
// intent: the question type found by the keyword rules, used to pick related pages.
// Returns { text, model } from the first provider that answers; throws if all of them fail.
async function ask(message, history, lang, sure, page, intent) {
  const langName = LANG_NAMES[lang] || "English";
  // The page and language rules go at the end of the system prompt: small models follow them
  // there more reliably than a note added to the student's message.
  const pageNote = page ? `Current page: the student is on ${page}.` : "";
  const langRule = sure
    ? `Language: the student wrote in ${langName}. Write your whole answer in ${langName} only.`
    : `Language: write your whole answer in the same language as the student's latest message. If you cannot tell, use ${langName}.`;
  const messages = [
    { role: "system", content: `${buildSystemPrompt(pagesFor(page, intent))}\n\n${pageNote}\n${langRule}` },
    ...history,
    { role: "user", content: message },
  ];
  const errors = [];
  for (const p of providers()) {
    try {
      return { text: await callProvider(p, messages), model: p.model };
    } catch (err) {
      console.error(`AI (${p.name}, ${p.model}) failed: ${err.message}`);
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  throw new Error(errors.length ? errors.join(" | ") : "no AI provider configured");
}

// The AI's reply is shown as HTML in the chat window, so never trust it as HTML:
// escape everything, then allow only links, bold text, bullets and line breaks.
function toSafeHtml(text) {
  const escape = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  return escape(text)
    .replace(/\[([^\]\n]+)\]\(((?:https?:\/\/[^\s()]+)|(?:[\w-]+\.html(?:#[\w-]+)?))\)/g, (m, label, url) =>
      url.startsWith("http")
        ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>`
        : `<a href="${url}">${label}</a>`)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/^\s*[-*] /gm, "• ")
    .replace(/\n/g, "<br>");
}

module.exports = { isConfigured, describe, ask, toSafeHtml };
