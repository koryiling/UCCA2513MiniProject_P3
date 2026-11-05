// Rule-based chatbot: finds the best-matching intent for a message using the keywords
// stored in MySQL, then returns that intent's response in the requested language.
const pool = require("./db");

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
async function findIntent(message) {
  const text = message.toLowerCase();
  const [rows] = await pool.query(
    `SELECT i.intent_code, i.priority, k.keyword
       FROM chat_keywords k
       JOIN chat_intents i ON i.intent_id = k.intent_id`
  );

  const scores = new Map();
  for (const row of rows) {
    if (!keywordMatches(text, row.keyword.toLowerCase())) continue;
    const s = scores.get(row.intent_code) || { priority: row.priority, matches: 0 };
    s.matches += 1;
    scores.set(row.intent_code, s);
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
  return best;
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
async function reply(message, lang) {
  if (!LANGS.includes(lang)) lang = "en";
  const intent = await findIntent(message);
  const text = (await getResponse(intent, lang)) ?? (await getResponse("fallback", lang));

  await pool.query(
    "INSERT INTO chat_logs (lang, user_message, intent_code) VALUES (?, ?, ?)",
    [lang, message, intent]
  );
  return { intent, reply: text };
}

module.exports = { reply, findIntent };
