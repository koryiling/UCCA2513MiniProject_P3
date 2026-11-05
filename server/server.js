// Backend for the UTAR Admission Assistant.
// - Serves the website in ../site
// - POST /api/chat: chatbot answers from the MySQL database
//
// Start with:  npm start   then open http://localhost:3000
const path = require("path");
const express = require("express");
const pool = require("./db");
const chatbot = require("./chatbot");

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "..", "site")));

// Chatbot: { "message": "How do I apply?", "lang": "en", "history": [...] }
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

  if (!message || message.length > 500) {
    return res.status(400).json({ error: "Message must be between 1 and 500 characters." });
  }
  try {
    res.json(await chatbot.reply(message, lang, history));
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({ error: "The assistant is not available right now." });
  }
});

// Quick check that the server can reach the database: http://localhost:3000/api/health
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", ai: require("./ai").isConfigured() ? require("./ai").describe() : "not configured (rule-based only)" });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.code || "not connected" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`UTAR Admission Assistant running at http://localhost:${port}`);
});
