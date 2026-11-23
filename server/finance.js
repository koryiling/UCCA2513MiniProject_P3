// Module 3: Tuition Fees & Scholarship Information.
// - Scholarship Matcher: which tier of the UTAR Scholarship for Top Achievers a student's results reach,
//   and what is still missing for the next tier.
// - Cost Estimator: estimated net programme cost after the scholarship, per year and per trimester,
//   with 6% SST for international students; comparison of two programmes.
// - Message Parser: finds the programme(s), qualification, result and student type in a chat message,
//   so the chatbot can answer with figures calculated here instead of guessed by the AI.
// The fees and tiers are stored in MySQL (database/finance.sql). The functions at the top work on plain
// data (no database), so they can be tested on their own: npm test.
// Results are estimates only: UTAR's official pages and DSFA have the final say.
const pool = require("./db");

const SST_RATE = 0.06;          // added to international students' fees
const TRIMESTERS_PER_YEAR = 3;
const STUDENT_TYPES = ["malaysian", "international"];
const QUALIFICATIONS = ["spm", "olevel", "stpm", "alevel", "uec", "foundation", "diploma"];
const COUNT_A_QUALS = ["spm", "olevel", "stpm", "alevel", "uec"];
// Programmes of the M. Kandiah Faculty of Medicine and Health Sciences have their own Top Achievers criteria,
// which are not covered by this tool (see database/finance.sql)
const OWN_CRITERIA = ["Bachelor of Chinese Medicine (Honours)", "Bachelor of Medicine and Bachelor of Surgery (MBBS)",
  "Bachelor of Nursing (Honours)", "Bachelor of Physiotherapy (Honours)"];

const round2 = n => Math.round(n * 100) / 100;

// ---------- Scholarship Matcher ----------

// The tiers for one qualification, highest waiver first.
function tiersFor(tiers, qualification) {
  return tiers.filter(t => t.qualification === qualification).sort((a, b) => b.waiver - a.waiver || b.min - a.min);
}

// Does a result reach this tier? aPlusAOnly: true / false / undefined (not known).
// Returns "yes", "no" or "maybe" (reached only if a condition the student has not confirmed is true).
function meetsTier(tier, value, aPlusAOnly) {
  const inRange = tier.resultType === "cgpa"
    ? value >= tier.min && (tier.max == null || value <= tier.max)
    : value >= tier.min;
  if (!inRange) return "no";
  if (tier.conditions.includes("a_plus_a_only")) {
    if (aPlusAOnly === true) return "yes";
    return aPlusAOnly === false ? "no" : "maybe";
  }
  return "yes";
}

// input: { qualification, value, aPlusAOnly? } where value is the number of As or the CGPA.
// Returns { qualification, studyLevel, waiver, tier, possible, next, conditions, source }:
//   waiver   - % tuition waiver the result reaches for sure (0 if none)
//   possible - a higher tier reached only if an unconfirmed condition holds, e.g. { waiver: 100, condition: "a_plus_a_only" }
//   next     - the next tier up and what is missing, e.g. { waiver: 100, needA: 1 } or { waiver: 100, needCgpa: 3.9 }
//   conditions - reminders that apply to the matched tier (straight passes, single sitting, ...)
function matchScholarship(tiers, input) {
  const qualification = String(input?.qualification || "").toLowerCase();
  if (!QUALIFICATIONS.includes(qualification)) throw new Error("Unknown qualification.");
  const value = Number(input.value);
  const list = tiersFor(tiers, qualification);
  const type = list[0]?.resultType || (COUNT_A_QUALS.includes(qualification) ? "count_a" : "cgpa");
  if (!Number.isFinite(value) || value < 0 || (type === "cgpa" ? value > 4 : value > 20 || !Number.isInteger(value))) {
    throw new Error(type === "cgpa" ? "CGPA must be between 0.00 and 4.00." : "Number of As must be a whole number from 0 to 20.");
  }

  let matched = null;
  let possible = null;
  for (const tier of list) {
    const r = meetsTier(tier, value, input.aPlusAOnly);
    if (r === "maybe" && !possible && !matched) possible = { waiver: tier.waiver, condition: "a_plus_a_only" };
    if (r === "yes") { matched = tier; break; }
  }
  // The next tier up: the lowest tier with a bigger waiver than the one reached
  const reached = possible?.waiver ?? matched?.waiver ?? 0;
  const higher = list.filter(t => t.waiver > reached).sort((a, b) => a.waiver - b.waiver)[0];
  let next = null;
  if (higher) {
    next = { waiver: higher.waiver };
    if (higher.resultType === "cgpa") next.needCgpa = higher.min;
    else if (higher.min > value) next.needA = higher.min - value;
    if (higher.conditions.includes("a_plus_a_only")) next.condition = "a_plus_a_only";
  }
  const conditions = ["single_sitting", ...(matched ? matched.conditions : list[0]?.conditions || [])]
    .filter((c, i, all) => c && c !== "a_plus_a_only" && all.indexOf(c) === i);
  const source = list[0] ? { url: list[0].sourceUrl, lastChecked: list[0].lastChecked } : null;
  return {
    qualification,
    value,
    studyLevel: list[0]?.studyLevel || null,
    waiver: matched ? matched.waiver : 0,
    possible,
    next,
    conditions,
    source,
  };
}

// ---------- Cost Estimator ----------

// fee: one programme's fee record; studentType: "malaysian" | "international"; waiver: 0-100 (%).
// The waiver is applied to the whole estimated total as an estimate (UTAR applies it to the tuition fee).
function estimateCost(fee, studentType, waiver = 0) {
  if (!fee) throw new Error("Unknown programme.");
  if (!STUDENT_TYPES.includes(studentType)) throw new Error("Student type must be malaysian or international.");
  const w = Number(waiver);
  if (!Number.isFinite(w) || w < 0 || w > 100) throw new Error("Scholarship must be between 0% and 100%.");
  const total = studentType === "international" ? fee.feeInternational : fee.feeMalaysian;
  const sstRate = studentType === "international" ? SST_RATE : 0;
  const afterWaiver = total * (1 - w / 100);
  const net = round2(afterWaiver * (1 + sstRate));
  const perYear = round2(net / fee.durationYears);
  return {
    programmeId: fee.id,
    programme: fee.name,
    studentType,
    durationYears: fee.durationYears,
    campus: fee.campus,
    totalFee: total,
    waiver: w,
    waiverAmount: round2(total * w / 100),
    sstRate,
    sst: round2(afterWaiver * sstRate),
    netFee: net,
    perYear,
    perTrimester: round2(perYear / TRIMESTERS_PER_YEAR),
    source: { url: fee.sourceUrl, lastChecked: fee.lastChecked },
  };
}

// Two estimates side by side; difference = b - a (positive: the second programme costs more)
function compareCosts(feeA, feeB, studentType, waiver = 0) {
  const a = estimateCost(feeA, studentType, waiver);
  const b = estimateCost(feeB, studentType, waiver);
  return { a, b, difference: round2(b.netFee - a.netFee) };
}

// ---------- Message Parser ----------

// Short names students use for programmes, e.g. "Bachelor of Science (Honours) Software Engineering"
// -> "software engineering". Extra aliases cover common abbreviations.
const EXTRA_ALIASES = {
  "Bachelor of Computer Science (Honours)": ["comp sci", "cs degree", "电脑科学", "计算机科学", "sains komputer"],
  "Bachelor of Medicine and Bachelor of Surgery (MBBS)": ["mbbs", "medicine", "医学", "perubatan"],
  "Bachelor of Software Engineering (Honours)": ["software engineering", "软件工程", "kejuruteraan perisian"],
  "Bachelor of Accounting (Honours)": ["accounting", "会计", "perakaunan"],
  "Bachelor of Nursing (Honours)": ["nursing", "护理", "kejururawatan"],
  "Bachelor of Social Science (Honours) Psychology": ["psychology", "心理学", "psikologi"],
  "Bachelor of Business Administration (Honours)": ["business administration", "bba", "工商管理"],
};

function shortName(name) {
  return name
    .replace(/^Bachelor (of|in) /, "")
    .replace(/\((Honours|Hons)\)|with Honours/g, "")
    .replace(/^(Science|Arts|Social Science|Communication|Information Technology|Information Systems|Engineering|Technology)\s+(?=\S)/, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// [{ alias, programme }] longest first, so "financial economics" wins over "economics".
// Aliases shared by several programmes (e.g. "business administration") point only to the programme in EXTRA_ALIASES.
function buildAliases(programmes) {
  const list = [];
  const seen = new Map();
  for (const p of programmes) {
    const names = [shortName(p.name), p.name.toLowerCase(), ...(EXTRA_ALIASES[p.name] || [])];
    for (const alias of new Set(names)) {
      if (alias.length < 4) continue;
      if (seen.has(alias) && !(EXTRA_ALIASES[p.name] || []).includes(alias)) continue;
      seen.set(alias, p);
    }
  }
  for (const [alias, programme] of seen) list.push({ alias, programme });
  return list.sort((a, b) => b.alias.length - a.alias.length);
}

const QUAL_PATTERNS = [
  ["stpm", /\bstpm\b/i],
  ["alevel", /\ba[\s-]?levels?\b/i],
  ["uec", /\buec\b|统考|独中/i],
  ["olevel", /\bo[\s-]?levels?\b|\bigcse\b/i],
  ["spm", /\bspm\b/i],
  ["diploma", /\bdiploma\b/i],
  ["foundation", /\bfoundation\b|\basasi\b|\bmatric(ulation|ulasi)?\b|预科|先修/i],
];

// Number of As: "3As", "3 A's", "3A", "8A+", "3个A", "AAA"
function parseCountA(text) {
  const m = text.match(/(\d{1,2})\s*(?:个|粒)?\s*a(?:\+|['’]?s)?(?![a-z])/i);
  if (m) return Number(m[1]);
  const run = text.match(/(?:^|[^A-Za-z])(A{2,12})(?![A-Za-z])/);
  return run ? run[1].length : null;
}

function parseCgpa(text) {
  const m = text.match(/\b(?:c?gpa|pngk)\b[^\d]{0,8}([0-4](?:\.\d{1,4})?)/i) || text.match(/\b([0-4]\.\d{1,4})\s*(?:c?gpa|pngk)\b/i);
  return m ? Number(m[1]) : null;
}

const MALAYSIAN = new RegExp(["malaysian", "warganegara", "tempatan", "本地", "大马", "马来西亚人", "from malaysia", "dari malaysia",
  "sabah", "sarawak", "johor", "kedah", "kelantan", "melaka", "malacca", "negeri sembilan", "pahang", "penang", "pulau pinang",
  "perak", "perlis", "selangor", "terengganu", "kuala lumpur", "\\bkl\\b", "putrajaya", "labuan", "ipoh", "kota kinabalu",
  "kuching", "沙巴", "砂拉越", "柔佛", "槟城", "霹雳", "雪兰莪", "吉隆坡", "马六甲"].join("|"), "i");

// Returns { programmes: [fee records], qualification, value, studentType, studentTypeGiven }
function parseMessage(text, programmes) {
  const lower = String(text || "").toLowerCase();
  const found = [];
  let rest = lower;
  for (const { alias, programme } of buildAliases(programmes)) {
    const ascii = /^[\x00-\x7f]+$/.test(alias);
    const re = ascii ? new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`) : null;
    const hit = ascii ? re.test(rest) : rest.includes(alias);
    if (hit && !found.includes(programme)) {
      found.push(programme);
      rest = rest.replace(ascii ? re : alias, " ");
    }
    if (found.length === 2) break;
  }
  const qualification = (QUAL_PATTERNS.find(([, re]) => re.test(text)) || [null])[0];
  let value = null;
  if (qualification) value = COUNT_A_QUALS.includes(qualification) ? parseCountA(text) : parseCgpa(text);
  else {
    const cgpa = parseCgpa(text);
    if (cgpa != null) value = cgpa; // CGPA without a named qualification: treated as Foundation
  }
  // Malaysian: said so, or named a Malaysian state or city ("I'm from Sabah")
  const local = MALAYSIAN.test(text);
  // International: said so, but not when only asking ("am I international?") or when a Malaysian place was named
  const asksIfIntl = /\b(am i|is it|considered|count as|adakah saya|saya dikira)\b[^.?!]{0,30}(international|foreign|antarabangsa|asing)|算不算|是不是国际/i.test(text);
  const intl = !local && !asksIfIntl && /international|foreign|overseas student|antarabangsa|pelajar asing|国际|外国|留学生/i.test(text);
  return {
    programmes: found,
    qualification: qualification || (value != null ? "foundation" : null),
    value,
    studentType: intl ? "international" : "malaysian",
    studentTypeGiven: intl || local,
  };
}

// ---------- Database ----------

let cache = null;
let cacheTime = 0;
const CACHE_MS = 60 * 1000;

async function loadData() {
  if (cache && Date.now() - cacheTime < CACHE_MS) return cache;
  const [fees] = await pool.query(
    `SELECT p.programme_id AS id, p.name, f.duration_years, f.fee_malaysian, f.fee_international,
            f.campus, f.faculty, f.source_url, f.last_checked
       FROM programme_fees f JOIN programmes p ON p.programme_id = f.programme_id
      ORDER BY p.sort_order, p.name`
  );
  const [tiers] = await pool.query(
    `SELECT study_level, qualification, result_type, min_value, max_value, waiver_percent, conditions, source_url, last_checked
       FROM scholarship_tiers ORDER BY qualification, waiver_percent DESC`
  );
  const [scholarships] = await pool.query(
    `SELECT code, name, kind, for_foundation, for_bachelor, applies_by, source_url, last_checked
       FROM scholarships ORDER BY sort_order`
  );
  cache = {
    programmes: fees.map(f => ({
      id: f.id, name: f.name, durationYears: Number(f.duration_years),
      feeMalaysian: Number(f.fee_malaysian), feeInternational: Number(f.fee_international),
      campus: f.campus, faculty: f.faculty, sourceUrl: f.source_url, lastChecked: f.last_checked,
      ownCriteria: OWN_CRITERIA.includes(f.name),
    })),
    tiers: tiers.map(t => ({
      studyLevel: t.study_level, qualification: t.qualification, resultType: t.result_type,
      min: Number(t.min_value), max: t.max_value == null ? null : Number(t.max_value), waiver: t.waiver_percent,
      conditions: t.conditions ? t.conditions.split(",").filter(Boolean) : [],
      sourceUrl: t.source_url, lastChecked: t.last_checked,
    })),
    scholarships: scholarships.map(s => ({
      code: s.code, name: s.name, kind: s.kind, forFoundation: !!s.for_foundation, forBachelor: !!s.for_bachelor,
      appliesBy: s.applies_by, sourceUrl: s.source_url, lastChecked: s.last_checked,
    })),
  };
  cacheTime = Date.now();
  return cache;
}

const findProgramme = (data, id) => data.programmes.find(p => p.id === Number(id));

// GET /api/finance-data: everything the fees and scholarship pages show
async function publicData() {
  const data = await loadData();
  return { ...data, sstRate: SST_RATE, trimestersPerYear: TRIMESTERS_PER_YEAR };
}

// ---------- Chatbot ----------

const MONEY_WORDS = /\b(fees?|costs?|price|tuition|how much|afford|cheap|expensive|scholarships?|waiver|discount|loan|ptptn|sst|yuran|kos|biasiswa|berapa|pinjaman)\b|学费|费用|多少钱|奖学金|贷款|免学费/i;
const FINANCE_INTENTS = ["fees", "scholarship"];

const rm = n => "RM" + Math.round(Number(n)).toLocaleString("en-MY");

const SCHOLARSHIP_WORDS = /scholarship|waiver|top achiever|biasiswa|奖学金|免学费/i;
const COST_WORDS = /\b(fees?|costs?|price|tuition|how much|afford|cheap|expensive|yuran|kos|berapa)\b|学费|费用|多少钱/i;
// "how about 3As?" (no qualification named): read the number for the qualification from earlier in the chat
function valueFor(qualification, text) {
  return COUNT_A_QUALS.includes(qualification) ? parseCountA(text) : parseCgpa(text);
}

// The figures for a message, using details the student gave earlier in the conversation
// (history: [{ role, content }], oldest first), e.g. "I got 2As in STPM" ... "how much is Computer Science?" ... "I'm international".
// Returns null when the conversation is not about fees or scholarships.
// { parsed, match, estimates, compare, asks } - asks: what the chatbot should ask for (missing details).
function chatResult(data, message, history = []) {
  const earlier = history.filter(m => m.role === "user").map(m => m.content).slice(-4).reverse(); // newest first
  const now = parseMessage(message, data.programmes);
  const hasDetail = now.qualification || now.programmes.length || now.studentTypeGiven || now.value != null ||
    parseCountA(message) != null;
  const financeNow = MONEY_WORDS.test(message);
  const financeBefore = earlier.slice(0, 2).some(t => MONEY_WORDS.test(t));
  if (!financeNow && !(hasDetail && financeBefore)) return null;

  // Fill in what this message does not say from earlier messages (newest first)
  const parsed = { ...now, programmes: [...now.programmes] };
  for (const text of earlier) {
    const old = parseMessage(text, data.programmes);
    if (!parsed.qualification && old.qualification) {
      parsed.qualification = old.qualification;
      const v = valueFor(old.qualification, message);
      parsed.value = v != null ? v : old.value;
    } else if (parsed.qualification && parsed.value == null && old.qualification === parsed.qualification && old.value != null) {
      parsed.value = old.value;
    }
    if (!parsed.programmes.length && old.programmes.length) parsed.programmes = old.programmes;
    if (!parsed.studentTypeGiven && old.studentTypeGiven) { parsed.studentType = old.studentType; parsed.studentTypeGiven = true; }
  }

  const out = { parsed, match: null, estimates: [], compare: null, asks: [] };
  if (parsed.qualification && parsed.value != null) {
    try { out.match = matchScholarship(data.tiers, parsed); } catch { out.match = null; }
  }
  const progs = parsed.programmes;
  for (const p of progs) {
    const waiver = out.match && out.match.studyLevel === "bachelor" && !p.ownCriteria ? out.match.waiver : 0;
    out.estimates.push(estimateCost(p, parsed.studentType, waiver));
  }
  if (out.estimates.length === 2) {
    out.compare = { a: out.estimates[0], b: out.estimates[1], difference: round2(out.estimates[1].netFee - out.estimates[0].netFee) };
  }
  // Missing details the chatbot should ask for
  if (parsed.qualification && parsed.value == null) out.asks.push("result");
  else if (!parsed.qualification && SCHOLARSHIP_WORDS.test(message)) out.asks.push("qualification");
  if (!progs.length && COST_WORDS.test(message)) out.asks.push("programme");
  if (out.estimates.length && !parsed.studentTypeGiven) out.asks.push("student_type");
  return out;
}

// What the chatbot should know about a message: chatResult() plus the text added to the AI's instructions (context).
async function forChat(message, intent, history = []) {
  if (!FINANCE_INTENTS.includes(intent) && !MONEY_WORDS.test(message) &&
      !history.filter(m => m.role === "user").slice(-2).some(m => MONEY_WORDS.test(m.content))) return null;
  const data = await loadData();
  const out = chatResult(data, message, history);
  if (!out) return null;
  const { parsed } = out;
  const progs = parsed.programmes;

  // Facts for the AI: the calculated results first, then the fee and tier tables for other questions
  const lines = ["<fees_and_scholarships>",
    "Figures calculated by the website's Fees & Scholarship module. Use these exact numbers; never calculate or guess other amounts.",
    "Always say amounts are estimates (UTAR notes totals may vary by 10%), and name the source with its last checked date.",
    "A Top Achievers scholarship is a tuition fee waiver: when a waiver is applied, say the actual amount may be higher because other fees in the total are not waived."];
  if (out.match) {
    const m = out.match;
    lines.push(`Scholarship result: ${m.qualification.toUpperCase()} ${m.value} -> UTAR Scholarship for Top Achievers ${m.waiver}% tuition fee waiver` +
      (m.studyLevel === "foundation" ? " (for a UTAR Foundation programme)" : " (for a Bachelor's degree)") + "." +
      (m.possible ? ` ${m.possible.waiver}% if all of these are A+ or A.` : "") +
      (m.next ? ` Next tier: ${m.next.waiver}%` + (m.next.needA ? ` with ${m.next.needA} more A.` : m.next.needCgpa ? ` with CGPA ${m.next.needCgpa.toFixed(2)} or above.` : ".") : "") +
      ` Awarded automatically on actual results in a single sitting` + (m.conditions.includes("straight_passes") ? ", with straight passes in all courses" : "") +
      `; criteria may change. Source: ${m.source.url} (checked ${m.source.lastChecked}).`);
  }
  for (const e of out.estimates) {
    lines.push(`Cost estimate: ${e.programme}, ${e.studentType} student, ${e.durationYears} years, ${e.campus} campus: ` +
      `total ${rm(e.totalFee)}` + (e.waiver ? `, minus ${e.waiver}% scholarship (${rm(e.waiverAmount)})` : "") +
      (e.sst ? `, plus 6% SST ${rm(e.sst)}` : "") + ` = ${rm(e.netFee)} in total, about ${rm(e.perYear)} per year or ${rm(e.perTrimester)} per trimester.` +
      (progs.find(p => p.id === e.programmeId)?.ownCriteria ? " This programme has its own scholarship criteria (see the DSFA page), so no Top Achievers waiver was applied." : "") +
      ` Source: ${e.source.url} (checked ${e.source.lastChecked}).`);
  }
  if (out.compare) lines.push(`Difference: ${out.compare.b.programme} costs ${rm(Math.abs(out.compare.difference))} ${out.compare.difference >= 0 ? "more" : "less"} than ${out.compare.a.programme}.`);
  const ASK_TEXT = {
    result: `The student mentioned ${String(parsed.qualification).toUpperCase()} but not the result: ask for the number of As (or the CGPA).`,
    qualification: "The student asked about scholarships without giving results: ask for their qualification (SPM, STPM, A-Level, UEC, Foundation or Diploma) and number of As or CGPA, so you can check the Top Achievers tier.",
    programme: "No programme was found in the question: if the student wants a cost, ask which programme (you may give the range from the table).",
    student_type: "The estimate assumes a Malaysian student; ask briefly if they are an international student (6% SST is then added).",
  };
  for (const a of out.asks) lines.push(ASK_TEXT[a]);
  lines.push("You calculate fees and scholarships in this chat. The fee table is on fees.html and the scholarship tiers on scholarship.html.");
  // Only the tables this question needs: free AI plans limit how much text can be sent per minute
  // (e.g. Groq: 8,000 tokens), so the full fee table is sent only for general fee questions.
  if (!progs.length && COST_WORDS.test(message)) {
    lines.push("", "Total programme fees (RM), Malaysian / international before 6% SST:");
    for (const p of data.programmes) lines.push(`- ${shortName(p.name)}: ${Math.round(p.feeMalaysian / 1000)}k / ${Math.round(p.feeInternational / 1000)}k`);
    lines.push("(Amounts rounded to the nearest RM1,000; for an exact figure, ask which programme.)");
  }
  const quals = parsed.qualification ? [parsed.qualification] : SCHOLARSHIP_WORDS.test(message) ? QUALIFICATIONS : [];
  if (quals.length) {
    lines.push("", "UTAR Scholarship for Top Achievers (tuition fee waiver; automatic, actual results in a single sitting):");
    for (const q of quals) {
      const list = tiersFor(data.tiers, q);
      if (!list.length) continue;
      const unit = list[0].resultType === "cgpa" ? "CGPA " : "";
      lines.push(`- ${q.toUpperCase()} (${list[0].studyLevel}): ` + list.map(t =>
        `${unit}${t.resultType === "cgpa" ? t.min.toFixed(2) + (t.max ? "-" + t.max.toFixed(4) : "+") : t.min + "As"}${t.conditions.includes("a_plus_a_only") ? " (A+ and A only)" : ""} = ${t.waiver}%`).join(", "));
    }
    lines.push("SPM and O-Level tiers are for the Foundation programme. Chinese Medicine, MBBS, Nursing and Physiotherapy have their own criteria on the DSFA page.");
  }
  if (/other|more|loan|ptptn|financial aid|bursary|available|what scholarships|which scholarships|bantuan|pinjaman|lain|贷款|助学金|其他|有哪些/i.test(message) && SCHOLARSHIP_WORDS.test(message) || /loan|ptptn|financial aid|pinjaman|bantuan kewangan|贷款|助学金/i.test(message)) {
    lines.push("", "Other UTAR scholarships and aid (apply in week 1-2 of the intake; loans week 1-4): " + data.scholarships.map(s => s.name).join("; ") + ". Details: https://dsfa.utar.edu.my/Scholarship-Opportunity-%40-UTAR.php");
  }
  lines.push("</fees_and_scholarships>");
  out.context = lines.join("\n");
  return out;
}

// Rule-based reply (used when no AI answers), in English, Chinese or Malay. Returns HTML or null.
const T = {
  en: {
    ask: {
      result: "How many As did you get (or what is your CGPA)? I can then check your Top Achievers scholarship.",
      qualification: "Tell me your qualification (SPM, STPM, A-Level, UEC, Foundation or Diploma) and how many As you got (or your CGPA), and I will check which UTAR Top Achievers scholarship you may get.",
      programme: "Which programme are you interested in? I can estimate its total cost, per year and per trimester.",
      student_type: "Are you an international student? If so, tell me and I will add the 6% SST.",
    },
    tier: (q, v, w) => `With <b>${q} ${v}</b>, you may qualify for the <b>UTAR Scholarship for Top Achievers: ${w}% tuition fee waiver</b>.`,
    none: (q, v) => `With <b>${q} ${v}</b>, you do not reach a Top Achievers tier yet.`,
    possible: w => ` If all of them are A+ or A, it is <b>${w}%</b>.`,
    nextA: (n, w) => ` ${n} more A would give ${w}%.`,
    nextCgpa: (c, w) => ` A CGPA of ${c} or above would give ${w}%.`,
    rules: "It is given automatically based on actual results in a single sitting.",
    foundation: "SPM and O-Level tiers are for UTAR's Foundation programme (a degree after Foundation uses your Foundation CGPA), so no waiver is applied to the degree cost below.",
    cost: e => `<b>${e.programme}</b> (${e.type}): about <b>${rm(e.netFee)}</b> in total, ${rm(e.perYear)} per year or ${rm(e.perTrimester)} per trimester` +
      (e.waiver ? ` after a ${e.waiver}% scholarship` : "") + (e.sst ? `, including 6% SST` : "") + ".",
    types: { malaysian: "Malaysian student", international: "international student" },
    diff: (a, b, d) => `${b} costs ${rm(Math.abs(d))} ${d >= 0 ? "more" : "less"} than ${a}.`,
    est: "These are estimates (UTAR notes fees may vary by 10%).",
    waiverNote: "The scholarship waives the tuition fee only, so the amount may be higher if the total includes other fees.",
    src: (u, d) => `Source: <a href="${u}" target="_blank" rel="noopener">UTAR</a>, checked ${d}.`,
  },
  zh: {
    ask: {
      result: "你考获几个 A（或 CGPA 是多少）？我可以帮你查看优秀生奖学金。",
      qualification: "请告诉我你的学历（SPM、STPM、A-Level、UEC、预科或文凭）以及考获几个 A（或 CGPA），我会帮你查看可能获得的 UTAR 优秀生奖学金。",
      programme: "你想了解哪个课程？我可以估算它的总费用、每年和每学期的费用。",
      student_type: "你是国际学生吗？如果是，请告诉我，我会加上 6% SST。",
    },
    tier: (q, v, w) => `以 <b>${q} ${v}</b> 的成绩，你可能符合 <b>UTAR 优秀生奖学金：${w}% 学费减免</b>。`,
    none: (q, v) => `以 <b>${q} ${v}</b> 的成绩，暂时未达到优秀生奖学金的级别。`,
    possible: w => `如果全部是 A+ 或 A，则为 <b>${w}%</b>。`,
    nextA: (n, w) => `再多 ${n} 个 A 可获得 ${w}%。`,
    nextCgpa: (c, w) => `CGPA 达到 ${c} 或以上可获得 ${w}%。`,
    rules: "奖学金根据一次考获的实际成绩自动颁发。",
    foundation: "SPM 和 O-Level 的级别适用于 UTAR 预科课程（预科后读学位则看预科 CGPA），因此以下学位费用未计入减免。",
    cost: e => `<b>${e.programme}</b>（${e.type}）：总费用约 <b>${rm(e.netFee)}</b>，每年约 ${rm(e.perYear)}，每学期约 ${rm(e.perTrimester)}` +
      (e.waiver ? `（已扣除 ${e.waiver}% 奖学金）` : "") + (e.sst ? `，含 6% SST` : "") + "。",
    types: { malaysian: "本地生", international: "国际生" },
    diff: (a, b, d) => `${b} 比 ${a} ${d >= 0 ? "贵" : "便宜"} ${rm(Math.abs(d))}。`,
    est: "以上为估算（UTAR 注明费用可能有 10% 差异）。",
    waiverNote: "奖学金只减免学费，若总费用包含其他费用，实际金额可能更高。",
    src: (u, d) => `来源：<a href="${u}" target="_blank" rel="noopener">UTAR</a>，查核日期 ${d}。`,
  },
  ms: {
    ask: {
      result: "Berapa A yang anda peroleh (atau berapa PNGK anda)? Saya boleh menyemak biasiswa Pencapai Cemerlang anda.",
      qualification: "Beritahu saya kelayakan anda (SPM, STPM, A-Level, UEC, Asasi atau Diploma) dan berapa A yang anda peroleh (atau PNGK anda), dan saya akan menyemak biasiswa Pencapai Cemerlang UTAR yang mungkin anda terima.",
      programme: "Program manakah yang anda minati? Saya boleh menganggarkan jumlah kos, kos setahun dan setiap trimester.",
      student_type: "Adakah anda pelajar antarabangsa? Jika ya, beritahu saya dan saya akan menambah SST 6%.",
    },
    tier: (q, v, w) => `Dengan <b>${q} ${v}</b>, anda mungkin layak untuk <b>Biasiswa UTAR untuk Pencapai Cemerlang: pengecualian yuran pengajian ${w}%</b>.`,
    none: (q, v) => `Dengan <b>${q} ${v}</b>, anda belum mencapai mana-mana peringkat Pencapai Cemerlang.`,
    possible: w => ` Jika semuanya A+ atau A, ia ialah <b>${w}%</b>.`,
    nextA: (n, w) => ` ${n} lagi A akan memberi ${w}%.`,
    nextCgpa: (c, w) => ` PNGK ${c} atau lebih akan memberi ${w}%.`,
    rules: "Ia diberi secara automatik berdasarkan keputusan sebenar dalam satu peperiksaan.",
    foundation: "Peringkat SPM dan O-Level adalah untuk program Asasi UTAR (ijazah selepas Asasi menggunakan PNGK Asasi anda), jadi tiada pengecualian dikira pada kos ijazah di bawah.",
    cost: e => `<b>${e.programme}</b> (${e.type}): kira-kira <b>${rm(e.netFee)}</b> keseluruhan, ${rm(e.perYear)} setahun atau ${rm(e.perTrimester)} setiap trimester` +
      (e.waiver ? ` selepas biasiswa ${e.waiver}%` : "") + (e.sst ? `, termasuk SST 6%` : "") + ".",
    types: { malaysian: "pelajar Malaysia", international: "pelajar antarabangsa" },
    diff: (a, b, d) => `${b} ${d >= 0 ? "lebih mahal" : "lebih murah"} ${rm(Math.abs(d))} daripada ${a}.`,
    est: "Ini anggaran sahaja (UTAR menyatakan yuran mungkin berbeza 10%).",
    waiverNote: "Biasiswa hanya mengecualikan yuran pengajian, jadi jumlah sebenar mungkin lebih tinggi jika jumlah termasuk yuran lain.",
    src: (u, d) => `Sumber: <a href="${u}" target="_blank" rel="noopener">UTAR</a>, disemak ${d}.`,
  },
};
const QUAL_LABEL = { spm: "SPM", olevel: "O-Level", stpm: "STPM", alevel: "A-Level", uec: "UEC", foundation: "Foundation", diploma: "Diploma" };

function ruleReply(result, lang) {
  if (!result) return null;
  const L = T[lang] || T.en;
  if (!result.match && !result.estimates.length) {
    return result.asks.length ? result.asks.map(a => L.ask[a]).filter(Boolean).join(" ") : null;
  }
  const parts = [];
  const m = result.match;
  if (m) {
    const q = QUAL_LABEL[m.qualification];
    const v = m.qualification === "foundation" || m.qualification === "diploma" ? `CGPA ${m.value.toFixed(2)}` : `${m.value}A`;
    let s = m.waiver ? L.tier(q, v, m.waiver) : L.none(q, v);
    if (m.possible) s += L.possible(m.possible.waiver);
    if (m.next?.needA) s += L.nextA(m.next.needA, m.next.waiver);
    else if (m.next?.needCgpa) s += L.nextCgpa(m.next.needCgpa.toFixed(2), m.next.waiver);
    parts.push(s + " " + L.rules + (m.studyLevel === "foundation" && result.estimates.length ? " " + L.foundation : ""));
  }
  for (const e of result.estimates) parts.push(L.cost({ ...e, type: L.types[e.studentType] }));
  if (result.compare) parts.push(L.diff(result.compare.a.programme, result.compare.b.programme, result.compare.difference));
  const src = result.estimates[0]?.source || m?.source;
  parts.push(L.est + (result.estimates.some(e => e.waiver) ? " " + L.waiverNote : "") + " " + (src ? L.src(src.url, src.lastChecked) : ""));
  const asks = result.asks.filter(a => a === "student_type" || a === "result").map(a => L.ask[a]);
  if (asks.length) parts.push(asks.join(" "));
  return parts.join("<br><br>");
}

module.exports = {
  // pure logic (tested in test/finance.test.js)
  matchScholarship, estimateCost, compareCosts, parseMessage, ruleReply, shortName,
  // used by server.js and chatbot.js
  chatResult, publicData, forChat,
  SST_RATE,
};
