// Application tools (login required): Personalized Document Checklist, Application Journey Tracker,
// and Application Date & Reminder. Everything a student saves is stored in MySQL under their user_id.
// The tracker and reminders are the student's own records: they are not connected to UTAR's systems.
const express = require("express");
const pool = require("./db");
const { requireUser } = require("./auth");

const router = express.Router();
router.use(requireUser);

// ---------- Profile (the student's situation) ----------
const PROFILE_OPTIONS = {
  nationality: ["malaysian", "international"],
  qualification: ["school", "preu", "foundation", "diploma", "degree"],
  programme_type: ["general", "mbbs", "nursing", "architecture", "art"],
};

// When each checklist item applies (checklist_items.applies_to)
const APPLIES = {
  all: () => true,
  malaysian: p => p.nationality === "malaysian",
  international: p => p.nationality === "international",
  preu: p => p.qualification === "preu",
  english_test: p => p.english_test,
  higher_learning: p => ["foundation", "diploma", "degree"].includes(p.qualification),
  diploma_up: p => ["diploma", "degree"].includes(p.qualification),
  credit_transfer: p => p.credit_transfer,
  architecture: p => p.programme_type === "architecture",
  art: p => p.programme_type === "art",
  medical: p => p.programme_type === "mbbs" || p.programme_type === "nursing",
  not_medical: p => p.programme_type !== "mbbs" && p.programme_type !== "nursing",
  mbbs: p => p.programme_type === "mbbs",
};

async function getProfile(userId) {
  const [rows] = await pool.query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
  if (!rows.length) return null;
  const p = rows[0];
  return {
    nationality: p.nationality,
    qualification: p.qualification,
    programme_type: p.programme_type,
    english_test: Boolean(p.english_test),
    credit_transfer: Boolean(p.credit_transfer),
    target_intake: p.target_intake,
  };
}

// Today's date on the server's clock (Malaysia time when run locally), as "YYYY-MM-DD"
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (isoDate, days) => {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const isIsoDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

// Wraps async route handlers so errors go to the error handler
const route = fn => (req, res, next) => fn(req, res).catch(next);

router.get("/profile", route(async (req, res) => {
  res.json({ user: { name: req.user.name, email: req.user.email }, profile: await getProfile(req.user.id) });
}));

// { nationality, qualification, programme_type, english_test, credit_transfer, target_intake }
router.put("/profile", route(async (req, res) => {
  const b = req.body || {};
  for (const [field, options] of Object.entries(PROFILE_OPTIONS)) {
    if (!options.includes(b[field])) return res.status(400).json({ error: `Invalid ${field}.` });
  }
  let intake = b.target_intake || null;
  if (intake) {
    const [rows] = await pool.query("SELECT 1 FROM important_dates WHERE date_code = ?", [intake]);
    if (!rows.length) return res.status(400).json({ error: "Invalid target_intake." });
  }
  // Credit transfer needs earlier studies at a college or university
  const creditTransfer = Boolean(b.credit_transfer) && ["diploma", "degree"].includes(b.qualification);
  await pool.query(
    `INSERT INTO user_profiles (user_id, nationality, qualification, programme_type, english_test, credit_transfer, target_intake)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nationality = VALUES(nationality), qualification = VALUES(qualification),
       programme_type = VALUES(programme_type), english_test = VALUES(english_test),
       credit_transfer = VALUES(credit_transfer), target_intake = VALUES(target_intake)`,
    [req.user.id, b.nationality, b.qualification, b.programme_type, b.english_test ? 1 : 0, creditTransfer ? 1 : 0, intake]
  );
  res.json({ profile: await getProfile(req.user.id) });
}));

// ---------- Personalized Document Checklist ----------
async function checklistFor(userId, profile) {
  if (!profile) return [];
  const [items] = await pool.query("SELECT item_code, phase, applies_to FROM checklist_items ORDER BY sort_order");
  const [done] = await pool.query("SELECT item_code FROM checklist_progress WHERE user_id = ?", [userId]);
  const doneSet = new Set(done.map(d => d.item_code));
  return items
    .filter(i => APPLIES[i.applies_to]?.(profile))
    .map(i => ({ code: i.item_code, phase: i.phase, done: doneSet.has(i.item_code) }));
}

router.get("/checklist", route(async (req, res) => {
  const profile = await getProfile(req.user.id);
  res.json({ profile, items: await checklistFor(req.user.id, profile) });
}));

// { done: true | false }
router.put("/checklist/:code", route(async (req, res) => {
  const [items] = await pool.query("SELECT 1 FROM checklist_items WHERE item_code = ?", [req.params.code]);
  if (!items.length) return res.status(404).json({ error: "Unknown item." });
  if (req.body?.done) {
    await pool.query("INSERT IGNORE INTO checklist_progress (user_id, item_code) VALUES (?, ?)", [req.user.id, req.params.code]);
  } else {
    await pool.query("DELETE FROM checklist_progress WHERE user_id = ? AND item_code = ?", [req.user.id, req.params.code]);
  }
  res.json({ ok: true });
}));

// ---------- Application Journey Tracker ----------
async function journeyFor(userId) {
  const [rows] = await pool.query(
    `SELECT s.stage_code, p.done_on FROM journey_stages s
     LEFT JOIN journey_progress p ON p.stage_code = s.stage_code AND p.user_id = ?
     ORDER BY s.sort_order`,
    [userId]
  );
  return rows.map(r => ({ code: r.stage_code, doneOn: r.done_on || null }));
}

router.get("/journey", route(async (req, res) => res.json({ stages: await journeyFor(req.user.id) })));

// { done: true | false }
router.put("/journey/:code", route(async (req, res) => {
  const [stages] = await pool.query("SELECT 1 FROM journey_stages WHERE stage_code = ?", [req.params.code]);
  if (!stages.length) return res.status(404).json({ error: "Unknown stage." });
  if (req.body?.done) {
    await pool.query("INSERT IGNORE INTO journey_progress (user_id, stage_code, done_on) VALUES (?, ?, CURDATE())", [req.user.id, req.params.code]);
  } else {
    await pool.query("DELETE FROM journey_progress WHERE user_id = ? AND stage_code = ?", [req.user.id, req.params.code]);
  }
  res.json({ stages: await journeyFor(req.user.id) });
}));

// ---------- Application Date & Reminder ----------
async function datesFor(userId, profile) {
  const [intakes] = await pool.query("SELECT date_code, applies_to, event_date FROM important_dates ORDER BY sort_order");
  const [custom] = await pool.query(
    "SELECT reminder_id, title, due_date FROM user_reminders WHERE user_id = ? ORDER BY due_date, reminder_id", [userId]
  );
  const reminders = custom.map(r => ({ id: r.reminder_id, kind: "custom", title: r.title, date: r.due_date }));
  // Reminders from the student's chosen intake
  const target = intakes.find(i => i.date_code === profile?.target_intake);
  if (target?.event_date) {
    reminders.push({ kind: "start", intake: target.date_code, date: target.event_date });
    // International students: apply at least 12 weeks before the start; less than 4 weeks may move to the next intake
    if (profile.nationality === "international") {
      reminders.push({ kind: "apply_by", intake: target.date_code, date: addDays(target.event_date, -84) });
      reminders.push({ kind: "late_apply", intake: target.date_code, date: addDays(target.event_date, -28) });
    }
  }
  reminders.sort((a, b) => a.date.localeCompare(b.date));
  return {
    today: today(),
    intakes: intakes.map(i => ({ code: i.date_code, appliesTo: i.applies_to, date: i.event_date })),
    targetIntake: profile?.target_intake || null,
    reminders,
  };
}

router.get("/dates", route(async (req, res) => {
  res.json(await datesFor(req.user.id, await getProfile(req.user.id)));
}));

// { target_intake } - changes only the chosen intake (the rest of the profile must exist)
router.put("/dates/intake", route(async (req, res) => {
  const intake = req.body?.target_intake || null;
  if (intake) {
    const [rows] = await pool.query("SELECT 1 FROM important_dates WHERE date_code = ?", [intake]);
    if (!rows.length) return res.status(400).json({ error: "Invalid target_intake." });
  }
  const [result] = await pool.query("UPDATE user_profiles SET target_intake = ? WHERE user_id = ?", [intake, req.user.id]);
  if (!result.affectedRows) return res.status(409).json({ error: "no_profile" });
  res.json(await datesFor(req.user.id, await getProfile(req.user.id)));
}));

// { title, date: "YYYY-MM-DD" }
router.post("/reminders", route(async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const date = String(req.body?.date || "");
  if (!title || title.length > 120) return res.status(400).json({ error: "title" });
  if (!isIsoDate(date)) return res.status(400).json({ error: "date" });
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM user_reminders WHERE user_id = ?", [req.user.id]);
  if (n >= 50) return res.status(400).json({ error: "too_many" });
  await pool.query("INSERT INTO user_reminders (user_id, title, due_date) VALUES (?, ?, ?)", [req.user.id, title, date]);
  res.status(201).json(await datesFor(req.user.id, await getProfile(req.user.id)));
}));

router.delete("/reminders/:id", route(async (req, res) => {
  await pool.query("DELETE FROM user_reminders WHERE reminder_id = ? AND user_id = ?", [Number(req.params.id), req.user.id]);
  res.json(await datesFor(req.user.id, await getProfile(req.user.id)));
}));

// ---------- Summary for the Application page ----------
router.get("/dashboard", route(async (req, res) => {
  const profile = await getProfile(req.user.id);
  const items = await checklistFor(req.user.id, profile);
  const stages = await journeyFor(req.user.id);
  const dates = await datesFor(req.user.id, profile);
  const now = dates.today;
  res.json({
    user: { name: req.user.name },
    hasProfile: Boolean(profile),
    checklist: { done: items.filter(i => i.done).length, total: items.length },
    journey: { done: stages.filter(s => s.doneOn).length, total: stages.length, next: stages.find(s => !s.doneOn)?.code || null },
    // Reminders from today up to 30 days ahead
    upcoming: dates.reminders.filter(r => r.date >= now && r.date <= addDays(now, 30)),
    today: now,
  });
}));

module.exports = router;
