// Tests for the fees and scholarship logic (server/finance.js): npm test
// The test data is read from database/finance.sql, so the tests check the real fees and tiers
// without needing MySQL. The cases follow the functional test plan (Table 4.1 of Assignment 2).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// finance.js loads server/db.js (MySQL); the pure functions do not need it, so a stand-in is used.
require.cache[require.resolve("../server/db")] = { exports: { query: async () => [[]] } };
const finance = require("../server/finance");

const sql = fs.readFileSync(path.join(__dirname, "..", "database", "finance.sql"), "utf8");
const unquote = s => s.replace(/^'|'$/g, "").replace(/''/g, "'");

// Fee rows: SELECT programme_id, 3.0, 58500, 82050, 'Kampar', 'FICT', 'url', '2026-11-16' FROM programmes WHERE name = '...'
let nextId = 1;
const programmes = [...sql.matchAll(/SELECT programme_id, ([\d.]+), (\d+), (\d+), '([^']*)', '([^']*)', '([^']*)', '([^']*)' FROM programmes WHERE name = ('(?:[^']|'')*')/g)]
  .map(m => ({
    id: nextId++, name: unquote(m[8]), durationYears: Number(m[1]), feeMalaysian: Number(m[2]), feeInternational: Number(m[3]),
    campus: m[4], faculty: m[5], sourceUrl: m[6], lastChecked: m[7],
    ownCriteria: ["Bachelor of Chinese Medicine (Honours)", "Bachelor of Medicine and Bachelor of Surgery (MBBS)",
      "Bachelor of Nursing (Honours)", "Bachelor of Physiotherapy (Honours)"].includes(unquote(m[8])),
  }));
const tiers = [...sql.matchAll(/\('(foundation|bachelor)', '(\w+)', '(count_a|cgpa)', ([\d.]+), (NULL|[\d.]+), (\d+), '([^']*)', '([^']*)', '([^']*)'\)/g)]
  .map(m => ({
    studyLevel: m[1], qualification: m[2], resultType: m[3], min: Number(m[4]), max: m[5] === "NULL" ? null : Number(m[5]),
    waiver: Number(m[6]), conditions: m[7] ? m[7].split(",") : [], sourceUrl: m[8], lastChecked: m[9],
  }));
const byName = name => programmes.find(p => p.name === name);
const CS = byName("Bachelor of Computer Science (Honours)");
const SE = byName("Bachelor of Software Engineering (Honours)");
const match = input => finance.matchScholarship(tiers, input);

test("finance.sql has all 76 programme fees and 25 scholarship tiers", () => {
  assert.equal(programmes.length, 76);
  assert.equal(new Set(programmes.map(p => p.name)).size, 76);
  assert.equal(tiers.length, 25);
});

test("every programme in finance.sql exists in programmes.sql", () => {
  const programmesSql = fs.readFileSync(path.join(__dirname, "..", "database", "programmes.sql"), "utf8");
  for (const p of programmes) assert.ok(programmesSql.includes(`'${p.name.replace(/'/g, "''")}'`), p.name);
});

// ---------- Scholarship Matcher (TC01-TC09) ----------
test("TC01 STPM 3As -> 100%", () => assert.equal(match({ qualification: "stpm", value: 3 }).waiver, 100));

test("TC02 STPM 2As -> 50%, one more A for 100%", () => {
  const r = match({ qualification: "stpm", value: 2 });
  assert.equal(r.waiver, 50);
  assert.deepEqual(r.next, { waiver: 100, needA: 1 });
});

test("TC03 STPM no As -> 0%, lowest tier shown as next", () => {
  const r = match({ qualification: "stpm", value: 0 });
  assert.equal(r.waiver, 0);
  assert.deepEqual(r.next, { waiver: 25, needA: 1 });
});

test("TC04 UEC 6As -> 25%", () => assert.equal(match({ qualification: "uec", value: 6 }).waiver, 25));
test("TC05 UEC 4As -> 10%", () => assert.equal(match({ qualification: "uec", value: 4 }).waiver, 10));
test("TC06 A-Level 1A -> 25%", () => assert.equal(match({ qualification: "alevel", value: 1 }).waiver, 25));

test("TC07 Foundation CGPA 3.95 -> 100%, with straight passes reminder", () => {
  const r = match({ qualification: "foundation", value: 3.95 });
  assert.equal(r.waiver, 100);
  assert.ok(r.conditions.includes("straight_passes"));
});

test("TC08 Foundation CGPA 3.8999 -> 50% (boundary)", () => {
  const r = match({ qualification: "foundation", value: 3.8999 });
  assert.equal(r.waiver, 50);
  assert.deepEqual(r.next, { waiver: 100, needCgpa: 3.9 });
});

test("TC09 Foundation CGPA 3.79 -> 0%", () => assert.equal(match({ qualification: "foundation", value: 3.79 }).waiver, 0));

test("SPM 8As: 50% for sure, 100% only if all are A+ or A", () => {
  const unknown = match({ qualification: "spm", value: 8 });
  assert.equal(unknown.waiver, 50);
  assert.deepEqual(unknown.possible, { waiver: 100, condition: "a_plus_a_only" });
  assert.equal(unknown.studyLevel, "foundation");
  assert.equal(match({ qualification: "spm", value: 8, aPlusAOnly: true }).waiver, 100);
  assert.equal(match({ qualification: "spm", value: 8, aPlusAOnly: false }).waiver, 50);
});

test("more As than the top tier still gives the top tier", () => {
  assert.equal(match({ qualification: "uec", value: 11 }).waiver, 100);
  assert.equal(match({ qualification: "uec", value: 11 }).next, null);
});

test("invalid inputs are rejected", () => {
  assert.throws(() => match({ qualification: "gcse", value: 3 }), /Unknown qualification/);
  assert.throws(() => match({ qualification: "stpm", value: -1 }));
  assert.throws(() => match({ qualification: "stpm", value: 2.5 }));
  assert.throws(() => match({ qualification: "foundation", value: 4.5 }), /CGPA/);
});

// ---------- Cost Estimator (TC10-TC13) ----------
test("TC10 Computer Science, Malaysian, no scholarship -> RM58,500, RM19,500 per year", () => {
  const e = finance.estimateCost(CS, "malaysian", 0);
  assert.equal(e.netFee, 58500);
  assert.equal(e.perYear, 19500);
  assert.equal(e.perTrimester, 6500);
});

test("TC11 Computer Science, Malaysian, 50% -> RM29,250", () => {
  const e = finance.estimateCost(CS, "malaysian", 50);
  assert.equal(e.netFee, 29250);
  assert.equal(e.waiverAmount, 29250);
});

test("TC12 Computer Science, international, no scholarship -> RM86,973 with 6% SST", () => {
  const e = finance.estimateCost(CS, "international", 0);
  assert.equal(e.netFee, 86973);
  assert.equal(e.sst, 4923);
  assert.equal(e.perYear, 28991);
});

test("TC13 Computer Science vs Software Engineering (Malaysian) -> difference RM1,600", () => {
  const c = finance.compareCosts(CS, SE, "malaysian", 0);
  assert.equal(c.difference, -1600); // Software Engineering costs RM1,600 less
});

test("estimate rejects bad input", () => {
  assert.throws(() => finance.estimateCost(null, "malaysian", 0), /Unknown programme/);
  assert.throws(() => finance.estimateCost(CS, "local", 0), /Student type/);
  assert.throws(() => finance.estimateCost(CS, "malaysian", 150), /Scholarship/);
});

// ---------- Message Parser ----------
test("parser: STPM 3As and Computer Science", () => {
  const p = finance.parseMessage("I got 3As in STPM, how much is Computer Science?", programmes);
  assert.equal(p.qualification, "stpm");
  assert.equal(p.value, 3);
  assert.deepEqual(p.programmes.map(x => x.name), ["Bachelor of Computer Science (Honours)"]);
  assert.equal(p.studentType, "malaysian");
  assert.equal(p.studentTypeGiven, false);
});

test("parser: UEC 6A, international", () => {
  const p = finance.parseMessage("UEC 6A, international student, scholarship?", programmes);
  assert.equal(p.qualification, "uec");
  assert.equal(p.value, 6);
  assert.equal(p.studentType, "international");
});

test("parser: Foundation CGPA 3.85 and Chinese / Malay messages", () => {
  assert.deepEqual((({ qualification, value }) => ({ qualification, value }))(finance.parseMessage("foundation CGPA 3.85", programmes)),
    { qualification: "foundation", value: 3.85 });
  const zh = finance.parseMessage("我STPM拿了2个A，计算机科学学费多少？", programmes);
  assert.equal(zh.qualification, "stpm");
  assert.equal(zh.value, 2);
  assert.equal(zh.programmes[0]?.name, "Bachelor of Computer Science (Honours)");
  const ms = finance.parseMessage("Saya dapat 7A UEC, berapa yuran perakaunan?", programmes);
  assert.equal(ms.value, 7);
  assert.equal(ms.programmes[0]?.name, "Bachelor of Accounting (Honours)");
});

test("parser: AAA counts as 3 As, and two programmes are found for a comparison", () => {
  assert.equal(finance.parseMessage("A-Level AAA", programmes).value, 3);
  const p = finance.parseMessage("compare software engineering and computer science fees", programmes);
  assert.equal(p.programmes.length, 2);
});

test("parser: the longer programme name wins (Financial Economics vs Economics)", () => {
  const p = finance.parseMessage("fees for financial economics analytics", programmes);
  assert.equal(p.programmes[0].name, "Bachelor in Financial Economics Analytics (Honours)");
});

test("parser: no qualification or programme in an unrelated message", () => {
  const p = finance.parseMessage("where is the library?", programmes);
  assert.equal(p.qualification, null);
  assert.equal(p.programmes.length, 0);
});

// ---------- Rule-based reply ----------
test("rule-based reply has the figures, the estimate note and the source in each language", () => {
  const m = match({ qualification: "stpm", value: 2 });
  const e = finance.estimateCost(CS, "malaysian", m.waiver);
  for (const lang of ["en", "zh", "ms"]) {
    const html = finance.ruleReply({ match: m, estimates: [e], compare: null, asks: [] }, lang);
    assert.match(html, /50%/);
    assert.match(html, /RM29,250/);
    assert.match(html, /RM9,750/);
    assert.match(html, /study\.utar\.edu\.my/);
  }
  assert.equal(finance.ruleReply({ match: null, estimates: [], compare: null, asks: [] }, "en"), null);
  assert.equal(finance.ruleReply(null, "en"), null);
});

// ---------- Chatbot conversation (details remembered from earlier messages, follow-up questions) ----------
const data = { programmes, tiers, scholarships: [] };
const user = content => ({ role: "user", content });
const bot = content => ({ role: "assistant", content });

test("chat: one message with everything -> tier and cost", () => {
  const r = finance.chatResult(data, "I got 3As in STPM, how much is Computer Science?");
  assert.equal(r.match.waiver, 100);
  assert.equal(r.estimates[0].programme, CS.name);
  assert.deepEqual(r.asks, ["student_type"]); // assumed Malaysian, so the bot asks
});

test("chat: details are remembered across messages", () => {
  const history = [user("How much is Computer Science?"), bot("About RM58,500 ..."), user("I got 2As in STPM"), bot("50% ...")];
  const r = finance.chatResult(data, "I'm an international student", history);
  assert.equal(r.parsed.studentType, "international");
  assert.equal(r.match.waiver, 50);
  assert.equal(r.estimates[0].programme, CS.name);
  assert.equal(r.estimates[0].netFee, 43486.5); // 82,050 x 50% x 1.06
  assert.deepEqual(r.asks, []);
});

test("chat: 'what about 3As?' reuses the qualification from before", () => {
  const history = [user("STPM 2As, what scholarship can I get?"), bot("50% ...")];
  const r = finance.chatResult(data, "what about 3As?", history);
  assert.equal(r.match.qualification, "stpm");
  assert.equal(r.match.waiver, 100);
});

test("chat: asks for what is missing", () => {
  assert.deepEqual(finance.chatResult(data, "Can I get a scholarship?").asks, ["qualification"]);
  assert.deepEqual(finance.chatResult(data, "I took STPM, any scholarship?").asks, ["result"]);
  assert.deepEqual(finance.chatResult(data, "How much are the tuition fees?").asks, ["programme"]);
  const html = finance.ruleReply(finance.chatResult(data, "Can I get a scholarship?"), "en");
  assert.match(html, /qualification/);
});

test("chat: unrelated messages are left to the other chatbot answers", () => {
  assert.equal(finance.chatResult(data, "Where is the library?"), null);
  assert.equal(finance.chatResult(data, "Computer Science entry requirements?"), null);
  // a detail after an unrelated conversation does not start a fee answer
  assert.equal(finance.chatResult(data, "I'm international", [user("How do I apply?"), bot("...")]), null);
});

test("parser: Malaysian states count as Malaysian; asking 'am I international?' is not a yes", () => {
  const sabah = finance.parseMessage("im from sabah, am i international?", programmes);
  assert.equal(sabah.studentType, "malaysian");
  assert.equal(sabah.studentTypeGiven, true);
  const ask = finance.parseMessage("am I considered an international student?", programmes);
  assert.equal(ask.studentType, "malaysian");
  assert.equal(ask.studentTypeGiven, false);
  assert.equal(finance.parseMessage("I'm an international student from Indonesia", programmes).studentType, "international");
});

test("rule reply: SPM tiers are explained as Foundation scholarships", () => {
  const r = finance.chatResult(data, "I got 3A in SPM, how much is computer science?");
  assert.equal(r.match.studyLevel, "foundation");
  assert.equal(r.estimates[0].waiver, 0);
  assert.match(finance.ruleReply(r, "en"), /Foundation programme/);
});
