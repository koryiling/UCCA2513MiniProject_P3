// Automatic test of the Smart Eligibility Checker:  npm test
// Runs the 30 test students in test/eligibility-cases.json through the checker (server/eligibility.js)
// and compares each result with the expected answer, like marking an exam paper with an answer key.
//
// Needs MySQL running with the data loaded (npm run db:setup); the website itself does not need to be running.
// Writes the results to test/results/eligibility-test-results.md (a table for the report) and .csv.
const fs = require("fs");
const path = require("path");
const eligibility = require("../server/eligibility");
const pool = require("../server/db");

const CASES_FILE = path.join(__dirname, "eligibility-cases.json");
const RESULTS_DIR = path.join(__dirname, "results");

// Compares one result with the expected answer. Returns a list of differences (empty = pass).
function compare(expected, result) {
  const problems = [];
  if (result.verdict !== expected.verdict) problems.push(`verdict ${result.verdict}, expected ${expected.verdict}`);
  // The reasons must appear as conditions or unmet requirements in the result
  const reasons = result.items.filter(i => i.status === "cond" || i.status === "fail").map(i => i.code);
  for (const r of expected.reasons || []) {
    if (!reasons.includes(r)) problems.push(`missing reason "${r}"`);
  }
  if (expected.foundation && result.foundation?.verdict !== expected.foundation) {
    problems.push(`Foundation route ${result.foundation?.verdict ?? "none"}, expected ${expected.foundation}`);
  }
  return problems;
}

// Short text of what the checker said, e.g. "conditional (mec, iep)"
function describe(result) {
  const reasons = result.items.filter(i => i.status !== "ok").map(i => i.code);
  let text = result.verdict + (reasons.length ? ` (${reasons.join(", ")})` : "");
  if (result.foundation) text += `; Foundation route: ${result.foundation.verdict}`;
  return text;
}

async function main() {
  const { cases } = JSON.parse(fs.readFileSync(CASES_FILE, "utf8"));
  const data = await eligibility.publicData();
  const programmes = data.groups.flatMap(g => g.programmes);

  const rows = [];
  for (const c of cases) {
    const started = process.hrtime.bigint();
    let actual, problems;
    try {
      const programme = programmes.find(p => p.name === c.programme);
      if (!programme) throw new Error(`programme not found: ${c.programme}`);
      const input = {
        ...c.input,
        results: (c.input.results || []).map(([subject, grade]) => ({ subject, grade })),
      };
      const result = await eligibility.check({ programmeId: programme.id, ...input });
      actual = describe(result);
      problems = compare(c.expected, result);
    } catch (err) {
      actual = "error: " + err.message;
      problems = [err.message];
    }
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    rows.push({ ...c, actual, problems, pass: problems.length === 0, ms });
  }

  // ---------- Console report ----------
  const passed = rows.filter(r => r.pass).length;
  const pct = ((passed / rows.length) * 100).toFixed(1);
  const avgMs = (rows.reduce((n, r) => n + r.ms, 0) / rows.length).toFixed(1);
  console.log("\nSmart Eligibility Checker - automatic test\n");
  for (const r of rows) {
    const expected = r.expected.verdict + (r.expected.foundation ? `; Foundation route: ${r.expected.foundation}` : "");
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id}  ${r.programme}`);
    console.log(`      expected: ${expected}   got: ${r.actual}`);
    if (!r.pass) console.log(`      problem: ${r.problems.join("; ")}`);
  }
  console.log(`\nResult: ${passed} / ${rows.length} passed (${pct}%), average ${avgMs} ms per check`);

  // ---------- Files for the report ----------
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const now = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
  const esc = s => String(s).replace(/\|/g, "\\|");
  const md = [
    "# Smart Eligibility Checker - Test Results",
    "",
    `Run on ${now}. Command: \`npm test\`.`,
    "",
    `**${passed} of ${rows.length} test cases passed (${pct}%).** Average time per check: ${avgMs} ms.`,
    "",
    "Each expected result was worked out by hand from UTAR's official Minimum Entry Requirements (October 2026).",
    "",
    "| ID | Test student | Programme | Qualification | Expected | Actual | Result |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(r => `| ${r.id} | ${esc(r.student)} | ${esc(r.programme)} | ${r.input.qualification.toUpperCase()} | ${esc(r.expected.verdict + (r.expected.foundation ? `; Foundation: ${r.expected.foundation}` : ""))} | ${esc(r.actual)} | ${r.pass ? "Pass" : "Fail"} |`),
    "",
    "Verdicts: likely = meets the minimum requirements; conditional = may be admitted with conditions",
    "(e.g. MEC, IEP, portfolio, interview); not_met = does not meet a requirement; no_route = the qualification",
    "leads to the degree through a Foundation programme.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(RESULTS_DIR, "eligibility-test-results.md"), md);
  const csvCell = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [
    ["ID", "Test student", "Programme", "Qualification", "Expected", "Actual", "Result", "Rule tested", "Time (ms)"].map(csvCell).join(","),
    ...rows.map(r => [r.id, r.student, r.programme, r.input.qualification.toUpperCase(),
      r.expected.verdict + (r.expected.foundation ? `; Foundation: ${r.expected.foundation}` : ""),
      r.actual, r.pass ? "Pass" : "Fail", r.rule, r.ms.toFixed(1)].map(csvCell).join(",")),
  ].join("\r\n");
  // BOM so that Excel opens the file as UTF-8
  fs.writeFileSync(path.join(RESULTS_DIR, "eligibility-test-results.csv"), "﻿" + csv);
  console.log(`Saved: test/results/eligibility-test-results.md and .csv\n`);

  await pool.end();
  process.exitCode = passed === rows.length ? 0 : 1;
}

main().catch(async err => {
  console.error("Test could not run:", err.code || "", err.message);
  console.error("Is MySQL running, and has 'npm run db:setup' been run?");
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
