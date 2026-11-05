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
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "..", "site")));

// Chatbot: { "message": "How do I apply?", "lang": "en" } -> { "intent": "apply_steps", "reply": "..." }
app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const lang = typeof req.body?.lang === "string" ? req.body.lang : "en";

  if (!message || message.length > 500) {
    return res.status(400).json({ error: "Message must be between 1 and 500 characters." });
  }
  try {
    res.json(await chatbot.reply(message, lang));
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({ error: "The assistant is not available right now." });
  }
});

// Quick check that the server can reach the database: http://localhost:3000/api/health
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.code || "not connected" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`UTAR Admission Assistant running at http://localhost:${port}`);
});
