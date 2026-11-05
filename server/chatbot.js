// Rule-based chatbot: finds the best-matching intent for a message using the keywords
// stored in MySQL, then returns that intent's response in the requested language.
const pool = require("./db");
const ai = require("./ai");

const LANGS = ["en", "zh", "ms"];

// Short English keywords (e.g. "hi", "ic", "pay") must match a whole word,
// otherwise "hi" would match "this". Other keywords match anywhere in the message.
function keywordMatches(message, keyword) {
  if (keyword.length <= 3 && /^[a-z]+$/.test(keyword)) {
    return new RegExp(`\\b${keyword}\\b`).test(message);
  }
  return message.includes(keyword);
}

// Pick the intent with the highest priority among those that matched;
// on a tie, the one with more matching keywords wins.
// Also counts which language the matching keywords are in, to reply in the user's language.
async function findIntent(message) {
  const text = message.toLowerCase();
  const [rows] = await pool.query(
    `SELECT i.intent_code, i.priority, k.keyword, k.lang
       FROM chat_keywords k
       JOIN chat_intents i ON i.intent_id = k.intent_id`
  );

  const scores = new Map();
  const langCounts = { en: 0, zh: 0, ms: 0 };
  for (const row of rows) {
    if (!keywordMatches(text, row.keyword.toLowerCase())) continue;
    const s = scores.get(row.intent_code) || { priority: row.priority, matches: 0 };
    s.matches += 1;
    scores.set(row.intent_code, s);
    langCounts[row.lang] += 1;
  }

  let best = "fallback";
  let bestScore = null;
  for (const [code, s] of scores) {
    if (!bestScore || s.priority > bestScore.priority ||
        (s.priority === bestScore.priority && s.matches > bestScore.matches)) {
      best = code;
      bestScore = s;
    }
  }
  return { intent: best, langCounts };
}

// Reply in the language the user typed in:
// Chinese characters -> Chinese; otherwise the language with the most matching keywords;
// if that is unclear (no match or a tie), use the language selected on the website.
// sure = false means the language was guessed from the website setting.
function detectLang(message, langCounts, pageLang) {
  if (/[一-鿿]/.test(message)) return { lang: "zh", sure: true };
  const ranked = ["en", "ms"].sort((a, b) => langCounts[b] - langCounts[a]);
  if (langCounts[ranked[0]] > langCounts[ranked[1]]) return { lang: ranked[0], sure: true };
  return { lang: pageLang, sure: false };
}

async function getResponse(intentCode, lang) {
  const [rows] = await pool.query(
    `SELECT r.response_text
       FROM chat_responses r
       JOIN chat_intents i ON i.intent_id = r.intent_id
      WHERE i.intent_code = ? AND r.lang = ?`,
    [intentCode, lang]
  );
  return rows.length ? rows[0].response_text : null;
}

// Answer one message and record it in chat_logs.
// The AI answers first (main AI, then backup AI, as set in .env); the rule-based answer is the last backup.
// pageLang is the language selected on the website, used when the message's language is unclear.
// history holds earlier turns [{ role, content }] so the AI can follow up on them.
// page is the page the student is on (e.g. "fees.html").
async function reply(message, pageLang, history = [], page = null) {
  if (!LANGS.includes(pageLang)) pageLang = "en";
  const { intent, langCounts } = await findIntent(message);
  const { lang, sure } = detectLang(message, langCounts, pageLang);

  let source = "rules";
  let model = null;
  let text;
  let html;
  if (ai.isConfigured()) {
    try {
      ({ text, model } = await ai.ask(message, history, lang, sure, page, intent));
      html = ai.toSafeHtml(text);
      source = "ai";
    } catch (err) {
      console.error("All AI providers failed, using rule-based answer:", err.message);
    }
  }
  if (source === "rules") {
    html = (await getResponse(intent, lang)) ?? (await getResponse("fallback", lang));
    text = html.replace(/<[^>]+>/g, "");
  }

  await pool.query(
    "INSERT INTO chat_logs (lang, user_message, intent_code, source) VALUES (?, ?, ?, ?)",
    [lang, message, intent, source]
  );
  // reply: HTML to show; text: plain version the browser keeps as conversation history
  return { source, model, intent, lang, reply: html, text };
}

module.exports = { reply, findIntent };
