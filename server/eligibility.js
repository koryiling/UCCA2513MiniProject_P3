// Admission tools: Requirement Explainer, Smart Eligibility Checker and Alternative Pathway Recommendation.
// The requirements are stored in MySQL (database/programmes.sql); this file holds the checking logic.
// Results are guidance only: UTAR makes the final admission decision.
const pool = require("./db");

// Grades from best to worst. "Grade C or better" = any grade up to and including C.
const SCALES = {
  spm: ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"],
  olevel: ["A*", "A", "B", "C", "D", "E", "F", "G", "U"],
  uec: ["A1", "A2", "B3", "B4", "B5", "B6", "C7", "C8", "F9"],
  stpm: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"],
  alevel: ["A*", "A", "B", "C", "D", "E", "U"],
};
const QUALIFICATIONS = ["spm", "olevel", "uec", "stpm", "alevel", "foundation", "diploma"];
const MAX_SUBJECTS = 12;

// Subjects the student can choose for each graded qualification ("other" = any other subject).
// The subject names are translated in site/js/i18n-tools.js ("sub.<code>").
const SUBJECTS = {
  spm: ["bm", "english", "math", "addmath", "history", "physics", "chemistry", "biology", "science", "accounting",
    "economics", "business", "computing", "geography", "chinese", "tamil", "islamic", "moral", "art", "other"],
  olevel: ["english", "math", "addmath", "physics", "chemistry", "biology", "science", "accounting", "economics",
    "business", "computing", "history", "geography", "malay", "chinese", "other"],
  uec: ["chinese", "malay", "english", "math", "addmath", "physics", "chemistry", "biology", "science", "accounting",
    "economics", "business", "computing", "history", "geography", "art", "other"],
  stpm: ["general_studies", "math_m", "math_t", "physics", "chemistry", "biology", "economics", "accounting", "business",
    "computing", "geography", "history", "lit_chinese", "lit_malay", "lit_english", "other"],
  alevel: ["math", "further_math", "physics", "chemistry", "biology", "computing", "economics", "accounting", "business",
    "psychology", "sociology", "history", "geography", "lit_english", "chinese", "other"],
};
// Subjects that count as Mathematics, a Natural Science, or ICT in the requirements
const MATH_SUBJECTS = ["math", "addmath", "math_m", "math_t", "further_math"];
const NATURAL_SCIENCES = ["physics", "chemistry", "biology"];
const SCIENCE_SUBJECTS = [...NATURAL_SCIENCES, "science"];
// Lowest credit and lowest pass grade, for SPM-level results (UEC "Grade B" counts as a credit)
const CREDIT = { spm: "C", olevel: "C", uec: "B6" };
const PASS = { spm: "E", olevel: "E", uec: "C8" };
// Questions answered from the subjects the student entered, so they are not asked
const DERIVED = {
  spm: ["spm_math", "spm_english", "spm_physics", "fis_subjects", "math_sci"],
  olevel: ["spm_math", "spm_english", "spm_physics", "fis_subjects", "math_sci"],
  uec: ["spm_math", "spm_english", "spm_physics", "fis_subjects", "math_sci"],
  stpm: ["math_sci"],
  alevel: ["math_sci"],
};

// Questions the student answers besides their grades. The options are answer codes;
// the text of each question and option is in site/js/i18n-tools.js.
const QUESTIONS = {
  spm_english: ["credit", "pass", "none"],
  spm_math: ["credit", "pass", "none"],
  spm_physics: ["pass", "none"],
  math_sci: ["yes", "no"],
  fis_subjects: ["yes", "no"],
  cs_maths: ["subjects", "addmath", "math_sci", "none"],
  study_field: ["science", "computing", "business", "arts", "other"],
};

// Extra conditions used in entry_requirements.rules and requirement_groups.english_rule.
// For each answer: "ok", ["cond", message] (admitted with a condition, e.g. the Mathematics
// Enhancement Course) or ["fail", message] (requirement not met). Messages are translated on the page.
const RULES = {
  math_credit_mec: { question: "spm_math", credit: "ok", pass: ["cond", "mec"], none: ["fail", "math_pass"] },
  math_credit:     { question: "spm_math", credit: "ok", pass: ["fail", "math_credit"], none: ["fail", "math_credit"] },
  math_pass_mec:   { question: "spm_math", credit: "ok", pass: "ok", none: ["cond", "mec"] },
  physics_pass:    { question: "spm_physics", pass: "ok", none: ["fail", "physics_pass"] },
  math_sci:        { question: "math_sci", yes: "ok", no: ["fail", "math_sci"] },
  fis_subjects:    { question: "fis_subjects", yes: "ok", no: ["fail", "fis_subjects"] },
  cs_maths:        { question: "cs_maths", subjects: "ok", addmath: "ok", math_sci: ["cond", "mec"], none: ["fail", "cs_maths"] },
  // English
  eng_foundation:  { question: "spm_english", credit: "ok", pass: ["cond", "eep"], none: ["cond", "eng_check"] },
  eng_bachelor:    { question: "spm_english", credit: "ok", pass: ["cond", "iep"], none: ["fail", "eng_pass"] },
  eng_credit:      { question: "spm_english", credit: "ok", pass: ["fail", "eng_credit"], none: ["fail", "eng_credit"] },
  eng_flex:        { question: "spm_english", credit: "ok", pass: ["cond", "iep"], none: ["cond", "eng_test"] },
};

const splitRules = text => (text || "").split(",").map(s => s.trim()).filter(Boolean);

// All groups, programmes and requirements, as used by the three tools.
async function loadData() {
  const [groups] = await pool.query("SELECT * FROM requirement_groups ORDER BY sort_order");
  const [programmes] = await pool.query("SELECT programme_id, group_code, name FROM programmes ORDER BY sort_order, name");
  const [rows] = await pool.query("SELECT * FROM entry_requirements ORDER BY requirement_id");
  return groups.map(g => ({
    code: g.group_code,
    level: g.level,
    englishRule: g.english_rule,
    foundationGroup: g.foundation_group,
    sourceUrl: g.source_url,
    programmes: programmes.filter(p => p.group_code === g.group_code).map(p => ({ id: p.programme_id, name: p.name })),
    requirements: rows.filter(r => r.group_code === g.group_code).map(r => ({
      qualification: r.qualification,
      field: r.study_field,
      minGrade: r.min_grade,
      minSubjects: r.min_subjects,
      minCgpa: r.min_cgpa == null ? null : Number(r.min_cgpa),
      reviewCgpa: r.review_cgpa == null ? null : Number(r.review_cgpa),
      rules: splitRules(r.rules),
    })),
  }));
}

// What the pages need: GET /api/admission-data
async function publicData() {
  return { groups: await loadData(), scales: SCALES, subjects: SUBJECTS, derived: DERIVED, questions: QUESTIONS, rules: RULES, maxSubjects: MAX_SUBJECTS };
}

// Checks and cleans the student's input. Throws an Error with a message for the API on bad input.
// input: { qualification, results: [{ subject: "math", grade: "A" }, ...], cgpa: 3.1, answers: { spm_math: "credit", ... } }
function cleanInput(input) {
  const qualification = input?.qualification;
  if (!QUALIFICATIONS.includes(qualification)) throw new Error("Unknown qualification.");
  const result = { qualification, results: [], grades: [], cgpa: null, answers: {} };
  if (SCALES[qualification]) {
    const results = Array.isArray(input.results) ? input.results : [];
    const valid = results.every(r => SUBJECTS[qualification].includes(r?.subject) && SCALES[qualification].includes(r?.grade));
    if (!results.length || results.length > MAX_SUBJECTS || !valid) {
      throw new Error("Enter between 1 and 12 subjects, each with a valid grade.");
    }
    const names = results.map(r => r.subject).filter(s => s !== "other");
    if (new Set(names).size !== names.length) throw new Error("Each subject can be entered only once.");
    result.results = results.map(r => ({ subject: r.subject, grade: r.grade }));
    result.grades = result.results.map(r => r.grade);
  } else {
    const cgpa = Number(input.cgpa);
    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 4) throw new Error("CGPA must be between 0.00 and 4.00.");
    result.cgpa = cgpa;
  }
  for (const [q, options] of Object.entries(QUESTIONS)) {
    const a = input.answers?.[q];
    if (a != null && a !== "") {
      if (!options.includes(a)) throw new Error(`Invalid answer for ${q}.`);
      result.answers[q] = a;
    }
  }
  Object.assign(result.answers, derivedAnswers(result));
  return result;
}

// True if the student has one of these subjects with grade minGrade or better
function hasSubject(input, subjects, minGrade) {
  const scale = SCALES[input.qualification];
  return input.results.some(r => subjects.includes(r.subject) && scale.indexOf(r.grade) <= scale.indexOf(minGrade));
}
function countSubjects(input, subjects, minGrade) {
  const scale = SCALES[input.qualification];
  return input.results.filter(r => subjects.includes(r.subject) && scale.indexOf(r.grade) <= scale.indexOf(minGrade)).length;
}

// Answers that follow from the subjects entered (SPM, O-Level and UEC include Mathematics and English)
function derivedAnswers(input) {
  const q = input.qualification;
  if (!CREDIT[q]) return {};
  const level = subjects => hasSubject(input, subjects, CREDIT[q]) ? "credit" : hasSubject(input, subjects, PASS[q]) ? "pass" : "none";
  return {
    spm_math: level(["math"]),
    spm_english: level(["english"]),
    spm_physics: hasSubject(input, ["physics"], PASS[q]) ? "pass" : "none",
    fis_subjects: hasSubject(input, ["math", "addmath"], CREDIT[q]) && countSubjects(input, SCIENCE_SUBJECTS, CREDIT[q]) >= 2 ? "yes" : "no",
  };
}

// The requirement row that applies: the row for the student's field if there is one, otherwise the "any field" row.
function findRequirement(group, input) {
  const rows = group.requirements.filter(r => r.qualification === input.qualification);
  return rows.find(r => r.field && r.field === input.answers.study_field) || rows.find(r => !r.field) || null;
}

function applyRule(code, input, row) {
  const rule = RULES[code];
  let answer = input.answers[rule.question];
  // Checked from the subjects entered: Mathematics and a Science (or ICT) subject at the required grade
  if (input.results.length && row.minGrade) {
    const both = others => hasSubject(input, MATH_SUBJECTS, row.minGrade) && hasSubject(input, others, row.minGrade);
    if (code === "math_sci") answer = both(NATURAL_SCIENCES) ? "yes" : "no";
    if (code === "cs_maths" && both([...SCIENCE_SUBJECTS, "computing"])) answer = "subjects";
  }
  if (!answer) return { status: "missing", code: rule.question };
  const outcome = rule[answer];
  if (outcome === "ok") return { status: "ok", code };
  return { status: outcome[0], code: outcome[1] };
}

// Checks one requirement group (all its programmes share the same requirements).
// Returns { verdict, items } where verdict is
//   "likely"      - meets the minimum requirements
//   "conditional" - may be admitted with conditions (e.g. MEC, IEP, internal evaluation)
//   "not_met"     - does not meet a requirement
//   "no_route"    - this qualification is not used for this programme (e.g. SPM for a degree)
//   "incomplete"  - a question has not been answered
// and items lists each check: { status: "ok" | "cond" | "fail" | "missing", code, params }.
function evaluateGroup(group, input) {
  const qualRows = group.requirements.filter(r => r.qualification === input.qualification);
  if (!qualRows.length) return { verdict: "no_route", items: [] };
  if (qualRows.some(r => r.field) && !input.answers.study_field) {
    return { verdict: "incomplete", items: [{ status: "missing", code: "study_field" }] };
  }
  const req = findRequirement(group, input);
  if (!req) return { verdict: "not_met", items: [{ status: "fail", code: "field" }] };

  const items = [];
  if (req.minGrade) {
    const scale = SCALES[input.qualification];
    const limit = scale.indexOf(req.minGrade);
    const have = input.grades.filter(g => scale.indexOf(g) <= limit).length;
    items.push({
      status: have >= req.minSubjects ? "ok" : "fail",
      code: "grades",
      params: { grade: req.minGrade, count: req.minSubjects, have },
    });
  } else {
    const params = { min: req.minCgpa.toFixed(2), review: req.reviewCgpa?.toFixed(2), cgpa: input.cgpa.toFixed(2) };
    if (input.cgpa >= req.minCgpa) items.push({ status: "ok", code: "cgpa", params });
    else if (req.reviewCgpa != null && input.cgpa >= req.reviewCgpa) items.push({ status: "cond", code: "cgpa_review", params });
    else items.push({ status: "fail", code: "cgpa", params });
  }
  for (const code of [...req.rules, group.englishRule]) items.push(applyRule(code, input, req));

  const has = s => items.some(i => i.status === s);
  const verdict = has("missing") ? "incomplete" : has("fail") ? "not_met" : has("cond") ? "conditional" : "likely";
  return { verdict, items };
}

// Smart Eligibility Checker: POST /api/eligibility { programmeId, qualification, grades | cgpa, answers }
async function check(body) {
  const input = cleanInput(body);
  const groups = await loadData();
  const group = groups.find(g => g.programmes.some(p => p.id === Number(body.programmeId)));
  if (!group) throw new Error("Unknown programme.");
  const result = evaluateGroup(group, input);
  // SPM / O-Level students reach a degree through a Foundation programme: check that too.
  if (result.verdict === "no_route" && group.foundationGroup) {
    const foundation = groups.find(g => g.code === group.foundationGroup);
    result.foundation = { group: foundation.code, programme: foundation.programmes[0]?.name, ...evaluateGroup(foundation, input) };
  }
  return { group: group.code, ...result };
}

// Alternative Pathway Recommendation: POST /api/pathways { qualification, grades | cgpa, answers, programmeId? }
// Checks every programme for the student's results and returns the ones they may enter,
// plus the Foundation route for SPM / O-Level / UEC students.
async function pathways(body) {
  const input = cleanInput(body);
  const groups = await loadData();
  const options = groups
    .map(g => ({ group: g.code, level: g.level, programmes: g.programmes.map(p => p.name), ...evaluateGroup(g, input) }))
    .filter(o => o.verdict === "likely" || o.verdict === "conditional")
    .sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "likely" ? -1 : 1));
  const target = body.programmeId ? groups.find(g => g.programmes.some(p => p.id === Number(body.programmeId))) : null;
  return {
    target: target ? { group: target.code, ...evaluateGroup(target, input) } : null,
    options,
  };
}

module.exports = { publicData, check, pathways, evaluateGroup, cleanInput, SCALES, SUBJECTS, QUESTIONS, RULES };
