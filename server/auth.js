// Student accounts: sign up, log in, log out.
// - Passwords are stored as salted scrypt hashes (Node's built-in crypto), never as plain text.
// - After login the browser gets a random session token in an HttpOnly cookie; the database stores
//   only the token's SHA-256 hash, so a leaked database cannot be used to log in.
const crypto = require("crypto");
const express = require("express");
const pool = require("./db");

const COOKIE = "uaa_session";
const SHORT_SESSION_DAYS = 1;   // without "Remember me"
const LONG_SESSION_DAYS = 30;   // with "Remember me"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Passwords ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function checkPassword(password, stored) {
  const [type, saltHex, hashHex] = String(stored).split("$");
  if (type !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- Sessions ----------
const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");

function readCookie(req, name) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

async function startSession(res, userId, remember) {
  const token = crypto.randomBytes(32).toString("hex");
  const days = remember ? LONG_SESSION_DAYS : SHORT_SESSION_DAYS;
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    [sha256(token), userId, days]
  );
  // Without "Remember me" the cookie ends when the browser is closed
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: days * 24 * 60 * 60 * 1000 } : {}),
  });
}

// Adds req.user = { id, name, email } when the request has a valid session
async function loadUser(req, res, next) {
  const token = readCookie(req, COOKIE);
  req.user = null;
  if (token) {
    try {
      const [rows] = await pool.query(
        `SELECT u.user_id, u.full_name, u.email FROM sessions s JOIN users u ON u.user_id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > NOW()`,
        [sha256(token)]
      );
      if (rows.length) req.user = { id: rows[0].user_id, name: rows[0].full_name, email: rows[0].email };
    } catch (err) {
      return next(err);
    }
  }
  next();
}

// For routes that need a logged-in student
function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please log in." });
  next();
}

// ---------- Routes: /api/auth/... ----------
const router = express.Router();

const publicUser = u => ({ name: u.name, email: u.email });

// { name, email, password } -> creates the account and logs in
router.post("/signup", async (req, res, next) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!name || name.length > 100) return res.status(400).json({ error: "name" });
  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: "email" });
  if (password.length < 8 || password.length > 200) return res.status(400).json({ error: "password" });
  try {
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hashPassword(password)]
    );
    await startSession(res, result.insertId, false);
    res.status(201).json({ user: { name, email } });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "email_taken" });
    next(err);
  }
});

// { email, password, remember } -> logs in
router.post("/login", async (req, res, next) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  try {
    const [rows] = await pool.query("SELECT user_id, full_name, email, password_hash FROM users WHERE email = ?", [email]);
    // Same answer for an unknown email and a wrong password, so emails cannot be guessed
    if (!rows.length || !checkPassword(password, rows[0].password_hash)) {
      return res.status(401).json({ error: "wrong_login" });
    }
    await pool.query("DELETE FROM sessions WHERE user_id = ? AND expires_at <= NOW()", [rows[0].user_id]);
    await startSession(res, rows[0].user_id, Boolean(req.body?.remember));
    res.json({ user: { name: rows[0].full_name, email: rows[0].email } });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  const token = readCookie(req, COOKIE);
  try {
    if (token) await pool.query("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// The logged-in student, or 401
router.get("/me", requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = { router, loadUser, requireUser };
