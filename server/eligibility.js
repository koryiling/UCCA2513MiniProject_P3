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
// Questions answered from the subjects the student entered (SPM, O-Level and UEC are SPM-level results),
// so they are not asked
const SPM_LEVEL = ["spm_math", "spm_english", "spm_physics", "fis_subjects", "spm_art", "spm_bm", "spm_chinese",
  "spm_science", "bm_or_english", "spm_math_sci_other", "cm_spm", "spm_2sci_math"];
const DERIVED = {
  spm: [...SPM_LEVEL, "spm_bm_math_sci"],
  olevel: [...SPM_LEVEL, "spm_bm_math_sci"],
  uec: SPM_LEVEL, // Nursing asks UEC students about their SPM results
};

// Questions the student answers besides their grades. The options are answer codes;
// the text of each question and option is in site/js/i18n-tools.js ("qq.<question>").
const YES_NO = ["yes", "no"];
const QUESTIONS = {
  spm_english: ["credit", "pass", "none"],
  spm_math: ["credit", "pass", "none"],
  spm_physics: ["pass", "none"],
  spm_science: ["credit", "none"],
  spm_bm: ["credit", "none"],
  spm_chinese: ["credit", "pass", "none"],
  spm_art: ["credit", "none"],
  bm_or_english: YES_NO,
  fis_subjects: YES_NO,
  cs_maths: ["subjects", "addmath", "math_sci", "none"],
  spm_math_sci_other: YES_NO,
  spm_2sci_math: YES_NO,
  spm_bm_math_sci: YES_NO,
  cm_spm: YES_NO,
  stpm_cgpa: ["ge300", "ge250", "ge200", "lt200"],
  english_high: YES_NO,
  muet3: YES_NO,
  found_bio2: YES_NO,
  mbbs_found_gpa: YES_NO,
  mbbs_spm_5b: YES_NO,
  mbbs_dip_spm: YES_NO,
  study_field: ["science", "computing", "business", "arts", "other"],
};

// ---------- Checks on the subjects entered ----------
// True if the student has one of these subjects with grade minGrade or better
function hasSubject(input, subjects, minGrade) {
  const scale = SCALES[input.qualification];
  return input.results.some(r => subjects.includes(r.subject) && scale.indexOf(r.grade) <= scale.indexOf(minGrade));
}
function countSubjects(input, subjects, minGrade) {
  const scale = SCALES[input.qualification];
  return input.results.filter(r => (!subjects || subjects.includes(r.subject)) && scale.indexOf(r.grade) <= scale.indexOf(minGrade)).length;
}
const graded = input => input.results.length > 0;

// Biology, Chemistry, Physics / Mathematics: how many of these three are at minGrade or better
function bioChemPhysMath(input, minGrade) {
  return [["biology"], ["chemistry"], ["physics", ...MATH_SUBJECTS]].filter(set => hasSubject(input, set, minGrade)).length;
}

// MBBS: STPM BBB / ABC / AAC (average grade point 3.00) in Biology, Chemistry and Physics or Mathematics;
// A-Level the same grades; UEC B4 in Biology, Chemistry, Physics and both Advanced Mathematics papers.
const STPM_POINTS = { A: 4, "A-": 3.67, "B+": 3.33, B: 3, "B-": 2.67, "C+": 2.33, C: 2 };
const ALEVEL_POINTS = { "A*": 3, A: 3, B: 2, C: 1 };
function mbbsSubjects(input) {
  const best = (subjects, points) => Math.max(0, ...input.results.filter(r => subjects.includes(r.subject)).map(r => points[r.grade] || 0));
  const three = points => [best(["biology"], points), best(["chemistry"], points), best(["physics", ...MATH_SUBJECTS], points)];
  if (input.qualification === "stpm") {
    const p = three(STPM_POINTS);
    return p.every(x => x > 0) && p.reduce((a, b) => a + b) / 3 >= 3 ? "yes" : "no";
  }
  if (input.qualification === "alevel") {
    const p = three(ALEVEL_POINTS);
    return p.every(x => x > 0) && p.reduce((a, b) => a + b) >= 6 ? "yes" : "no";
  }
  if (input.qualification === "uec") {
    return ["biology", "chemistry", "physics", "math", "addmath"].every(sub => hasSubject(input, [sub], "B4")) ? "yes" : "no";
  }
  return "no";
}

// Grade at which a Mathematics subject in the main qualification replaces the SPM Mathematics credit (Finance)
const MATH_WAIVER = { stpm: "C", alevel: "D", uec: "B6" };

// Extra conditions used in entry_requirements.rules and requirement_groups.english_rule.
//   question: the question whose answer decides the outcome (null when the rule needs no question)
//   compute(input, row): works the answer out from the subjects entered; when it returns undefined,
//                        the answer to the question is used instead
//   always: an outcome that applies to everyone (e.g. a portfolio or an interview)
//   <answer>: "ok", ["cond", message] (admitted with a condition, e.g. the Mathematics Enhancement Course)
//             or ["fail", message] (requirement not met). Messages are translated on the page ("res.<message>").
const RULES = {
  // Mathematics and Science
  math_credit_mec: { question: "spm_math", credit: "ok", pass: ["cond", "mec"], none: ["fail", "math_pass"] },
  math_credit:     { question: "spm_math", credit: "ok", pass: ["fail", "math_credit"], none: ["fail", "math_credit"] },
  math_pass_mec:   { question: "spm_math", credit: "ok", pass: "ok", none: ["cond", "mec"] },
  fin_math:        { question: "spm_math", credit: "ok", pass: ["fail", "fin_math"], none: ["fail", "fin_math"],
                     compute: input => (graded(input) && hasSubject(input, MATH_SUBJECTS, MATH_WAIVER[input.qualification]) ? "credit" : undefined) },
  math_subject:    { question: null, yes: "ok", no: ["fail", "math_subject"],
                     compute: (input, row) => (hasSubject(input, MATH_SUBJECTS, row.minGrade) ? "yes" : "no") },
  math_sci:        { question: null, yes: "ok", no: ["fail", "math_sci"],
                     compute: (input, row) => (hasSubject(input, MATH_SUBJECTS, row.minGrade) && hasSubject(input, NATURAL_SCIENCES, row.minGrade) ? "yes" : "no") },
  cs_maths:        { question: "cs_maths", subjects: "ok", addmath: "ok", math_sci: ["cond", "mec"], none: ["fail", "cs_maths"],
                     compute: (input, row) => (graded(input) && row.minGrade && hasSubject(input, MATH_SUBJECTS, row.minGrade)
                       && hasSubject(input, [...SCIENCE_SUBJECTS, "computing"], row.minGrade) ? "subjects" : undefined) },
  physics_pass:    { question: "spm_physics", pass: "ok", none: ["fail", "physics_pass"] },
  physics_subject: { question: null, yes: "ok", no: ["cond", "physics_faculty"],
                     compute: (input, row) => (hasSubject(input, ["physics"], row.minGrade) ? "yes" : "no") },
  fis_subjects:    { question: "fis_subjects", yes: "ok", no: ["fail", "fis_subjects"] },
  science_credit:  { question: "spm_science", credit: "ok", none: ["fail", "science_credit"] },
  science_credit_osh: { question: "spm_science", credit: "ok", none: ["cond", "science_course"] },
  biotech_spm:     { question: "spm_math_sci_other", yes: "ok", no: ["fail", "biotech_spm"] },
  cm_spm:          { question: "cm_spm", yes: "ok", no: ["fail", "cm_spm"] },
  // Health sciences
  med3_subjects:   { question: null, yes: "ok", no: ["fail", "med3_subjects"],
                     compute: (input, row) => (bioChemPhysMath(input, row.minGrade) >= 2 ? "yes" : "no") },
  found_bio2:      { question: "found_bio2", yes: "ok", no: ["fail", "found_bio2"] },
  tcm_sci:         { question: "spm_2sci_math", yes: "ok", no: ["fail", "tcm_sci"],
                     compute: (input, row) => (countSubjects(input, SCIENCE_SUBJECTS, row.minGrade) >= 2 ? "yes" : undefined) },
  spm_2sci_math:   { question: "spm_2sci_math", yes: "ok", no: ["fail", "tcm_found"] },
  stpm_cgpa_200:   { question: "stpm_cgpa", ge300: "ok", ge250: "ok", ge200: "ok", lt200: ["fail", "stpm_cgpa_200"] },
  stpm_cgpa_250:   { question: "stpm_cgpa", ge300: "ok", ge250: "ok", ge200: ["fail", "stpm_cgpa_250"], lt200: ["fail", "stpm_cgpa_250"] },
  mbbs_subjects:   { question: null, yes: "ok", no: ["fail", "mbbs_subjects"], compute: input => mbbsSubjects(input) },
  mbbs_found:      { question: "mbbs_found_gpa", yes: "ok", no: ["fail", "mbbs_found"] },
  mbbs_spm5b:      { question: "mbbs_spm_5b", yes: "ok", no: ["fail", "mbbs_spm5b"] },
  mbbs_dip_spm:    { question: "mbbs_dip_spm", yes: "ok", no: ["fail", "mbbs_dip_spm"] },
  mbbs_english:    { question: "english_high", yes: "ok", no: ["fail", "mbbs_english"] },
  muet3:           { question: "muet3", yes: "ok", no: ["fail", "muet3"] },
  bm_credit:       { question: "spm_bm", credit: "ok", none: ["fail", "bm_credit"] },
  nursing_uec_spm: { question: "spm_bm_math_sci", yes: "ok", no: ["fail", "nursing_uec_spm"] },
  // Languages
  eng_credit_req:  { question: "spm_english", credit: "ok", pass: ["fail", "eng_credit_req"], none: ["fail", "eng_credit_req"] },
  english_high:    { question: "english_high", yes: "ok", no: ["fail", "english_high"] },
  bm_or_english:   { question: "bm_or_english", yes: "ok", no: ["fail", "bm_or_english"] },
  chinese_credit:  { question: "spm_chinese", credit: "ok", pass: ["fail", "chinese_credit"], none: ["fail", "chinese_credit"] },
  chinese_pass:    { question: "spm_chinese", credit: "ok", pass: "ok", none: ["cond", "chinese_interview"] },
  // Portfolios, tests and interviews that apply to every applicant of the programme
  art_portfolio:   { question: "spm_art", credit: "ok", none: ["cond", "portfolio_arch"] },
  portfolio:       { question: null, always: ["cond", "portfolio_art"] },
  logic_test:      { question: null, always: ["cond", "logic_test"] },
  interview_gc:    { question: null, always: ["cond", "interview_gc"] },
  interview_mbbs:  { question: null, always: ["cond", "interview_mbbs"] },
  industry_mode:   { question: null, always: ["cond", "industry_mode"] },
  // General English requirement of each group (requirement_groups.english_rule; "none" = set by the rules above)
  eng_foundation:  { question: "spm_english", credit: "ok", pass: ["cond", "eep"], none: ["cond", "eng_check"] },
  eng_bachelor:    { question: "spm_english", credit: "ok", pass: ["cond", "iep"], none: ["fail", "eng_pass"] },
  eng_credit:      { question: "spm_english", credit: "ok", pass: ["fail", "eng_credit"], none: ["fail", "eng_credit"] },
  eng_flex:        { question: "spm_english", credit: "ok", pass: ["cond", "iep"], none: ["cond", "eng_test"] },
  eng_pass_only:   { question: "spm_english", credit: "ok", pass: "ok", none: ["fail", "eng_pass"] },
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

// Answers that follow from the subjects entered (SPM, O-Level and UEC are SPM-level results)
function derivedAnswers(input) {
  const q = input.qualification;
  if (!CREDIT[q]) return {};
  const credit = subjects => hasSubject(input, subjects, CREDIT[q]);
  const pass = subjects => hasSubject(input, subjects, PASS[q]);
  const level = subjects => (credit(subjects) ? "credit" : pass(subjects) ? "pass" : "none");
  const answers = {
    spm_math: level(["math"]),
    spm_english: level(["english"]),
    spm_physics: pass(["physics"]) ? "pass" : "none",
    spm_science: credit(SCIENCE_SUBJECTS) ? "credit" : "none",
    spm_bm: credit(["bm", "malay"]) ? "credit" : "none",
    spm_chinese: level(["chinese"]),
    spm_art: credit(["art"]) ? "credit" : "none",
    bm_or_english: credit(["bm", "malay", "english"]) ? "yes" : "no",
    fis_subjects: credit(["math", "addmath"]) && countSubjects(input, SCIENCE_SUBJECTS, CREDIT[q]) >= 2 ? "yes" : "no",
    spm_math_sci_other: credit(["math"]) && credit(SCIENCE_SUBJECTS) && countSubjects(input, null, CREDIT[q]) >= 3 ? "yes" : "no",
    spm_2sci_math: credit(["math", "addmath"]) && countSubjects(input, SCIENCE_SUBJECTS, CREDIT[q]) >= 2 ? "yes" : "no",
    cm_spm: pass(["math"]) && pass(["english"]) && pass([...SCIENCE_SUBJECTS, "computing", "art"]) ? "yes" : "no",
    spm_bm_math_sci: credit(["bm", "malay"]) && credit(["math"]) && credit(SCIENCE_SUBJECTS) ? "yes" : "no",
  };
  return Object.fromEntries(Object.entries(answers).filter(([k]) => DERIVED[q].includes(k)));
}

// The requirement row that applies: the row for the student's field if there is one, otherwise the "any field" row.
function findRequirement(group, input) {
  const rows = group.requirements.filter(r => r.qualification === input.qualification);
  return rows.find(r => r.field && r.field === input.answers.study_field) || rows.find(r => !r.field) || null;
}

function applyRule(code, input, row) {
  const rule = RULES[code];
  const toItem = outcome => (outcome === "ok" ? { status: "ok", code } : { status: outcome[0], code: outcome[1] });
  if (rule.always) return toItem(rule.always);
  const answer = (rule.compute && graded(input) ? rule.compute(input, row) : undefined) ?? input.answers[rule.question];
  if (!answer) return { status: "missing", code: rule.question };
  return toItem(rule[answer]);
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
  if (!req.minGrade && req.minCgpa == null) {
    // checked by the rules only (e.g. MBBS subject grades)
  } else if (req.minGrade) {
    const scale = SCALES[input.qualification];
    const limit = scale.indexOf(req.minGrade);
    const have = input.grades.filter(g => scale.indexOf(g) <= limit).length;
    items.push({
      status: have >= req.minSubjects ? "ok" : "fail",
      code: "grades",
      params: { grade: req.minGrade, count: req.minSubjects, have },
    });
  } else {
    const params = { min: req.minCgpa.toFixed(2), review: req.reviewCgpa == null ? undefined : req.reviewCgpa.toFixed(2), cgpa: input.cgpa.toFixed(2) };
    if (input.cgpa >= req.minCgpa) items.push({ status: "ok", code: "cgpa", params });
    else if (req.reviewCgpa != null && input.cgpa >= req.reviewCgpa) items.push({ status: "cond", code: "cgpa_review", params });
    else items.push({ status: "fail", code: "cgpa", params });
  }
  const english = group.englishRule === "none" ? [] : [group.englishRule];
  for (const code of [...req.rules, ...english]) items.push(applyRule(code, input, req));

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
