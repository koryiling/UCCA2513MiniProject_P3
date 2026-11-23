// Backend for the UTAR Admission Assistant.
// - Serves the website in ../site
// - POST /api/chat: chatbot answers from the MySQL database
// - GET /api/admission-data, POST /api/eligibility, POST /api/pathways: admission tools
// - /api/auth/...: sign up, log in, log out (server/auth.js)
// - /api/app/...: application tools for logged-in students (server/application.js)
// - GET /api/finance-data: fee and scholarship tables (server/finance.js; the chatbot does the calculations)
//
// Start with:  npm start   then open http://localhost:3000
const path = require("path");
const express = require("express");
const pool = require("./db");
const chatbot = require("./chatbot");
const eligibility = require("./eligibility");
const auth = require("./auth");
const applicationTools = require("./application");
const finance = require("./finance");

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "..", "site")));
app.use("/api", auth.loadUser); // sets req.user for logged-in students

// Chatbot: { "message": "How do I apply?", "lang": "en", "history": [...], "page": "application.html" }
//   -> { "source": "ai" | "rules", "intent": "apply_steps", "lang": "en", "reply": "<html>", "text": "..." }
app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const lang = typeof req.body?.lang === "string" ? req.body.lang : "en";
  // Earlier turns of the conversation (kept by the browser), so the AI can answer follow-up questions
  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (history.length && history[0].role !== "user") history.shift();
  // The page the student is asking from, e.g. "fees.html" (only plain page names are accepted)
  const page = /^[\w-]+\.html$/.test(req.body?.page || "") ? req.body.page : null;

  if (!message || message.length > 500) {
    return res.status(400).json({ error: "Message must be between 1 and 500 characters." });
  }
  try {
    res.json(await chatbot.reply(message, lang, history, page));
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({ error: "The assistant is not available right now." });
  }
});

// Admission tools (see server/eligibility.js). Bad input gets a 400 with the reason.
const toolRoute = handler => async (req, res) => {
  try {
    res.json(await handler(req.body));
  } catch (err) {
    if (err.code) {
      console.error("Admission tools error:", err.message);
      return res.status(500).json({ error: "The admission tools are not available right now." });
    }
    res.status(400).json({ error: err.message });
  }
};
// Programmes, requirements, grade scales and questions for the Explainer, Checker and Pathway pages
app.get("/api/admission-data", toolRoute(() => eligibility.publicData()));
// { programmeId, qualification, results: [{ subject, grade }] | cgpa, answers: {...} } -> { verdict, items, ... }
app.post("/api/eligibility", toolRoute(body => eligibility.check(body)));
// { qualification, results | cgpa, answers, programmeId? } -> { target, options }
app.post("/api/pathways", toolRoute(body => eligibility.pathways(body)));

// Fees and scholarships (Module 3, see server/finance.js). Scholarship and cost questions are answered
// by the chatbot; this only gives the fee table and scholarship tiers shown on fees.html and scholarship.html.
app.get("/api/finance-data", toolRoute(() => finance.publicData()));

// Accounts and the application tools
app.use("/api/auth", auth.router);
app.use("/api/app", applicationTools);

// Quick check that the server can reach the database: http://localhost:3000/api/health
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", ai: require("./ai").isConfigured() ? require("./ai").describe() : "not configured (rule-based only)" });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.code || "not connected" });
  }
});

// Unexpected errors (e.g. database down) in the account and application routes
app.use("/api", (err, req, res, next) => {
  console.error("API error:", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again later." });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`UTAR Admission Assistant running at http://localhost:${port}`);
});
