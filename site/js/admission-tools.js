// Admission tools: Requirement Explainer (explainer.html), Smart Eligibility Checker (eligibility.html)
// and Alternative Pathway Recommendation (pathway.html).
// The programmes and requirements come from MySQL through the backend (GET /api/admission-data);
// the eligibility checks run on the backend (POST /api/eligibility, POST /api/pathways, see server/eligibility.js).
// Load after i18n.js, i18n-tools.js and script.js.

const QUAL_ORDER = ["spm", "olevel", "uec", "stpm", "alevel", "foundation", "diploma"];
// Questions are asked in this order
const QUESTION_ORDER = ["study_field", "fis_subjects", "math_sci", "cs_maths", "spm_math", "spm_physics", "spm_english"];
const SAVED_INPUT = "uaa_tool_input"; // the student's results, kept for this browser tab only
// Subjects already filled in when a qualification is chosen (the student can change them)
const STARTER_SUBJECTS = {
  spm: ["bm", "english", "math", "history", "", ""],
  olevel: ["english", "math", "", "", "", ""],
  uec: ["chinese", "malay", "english", "math", "", ""],
  stpm: ["general_studies", "", "", ""],
  alevel: ["", "", ""],
};

let DATA = null;

async function loadAdmissionData() {
  const res = await fetch("/api/admission-data");
  if (!res.ok) throw new Error("HTTP " + res.status);
  DATA = await res.json();
  return DATA;
}

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

const groupByCode = code => DATA.groups.find(g => g.code === code);
const groupOfProgramme = id => DATA.groups.find(g => g.programmes.some(p => p.id === Number(id)));
const programmeById = id => DATA.groups.flatMap(g => g.programmes).find(p => p.id === Number(id));
const programmeCount = () => DATA.groups.reduce((n, g) => n + g.programmes.length, 0);

// Shows a message instead of the tool when the backend cannot be reached.
function showUnavailable(root) {
  root.innerHTML = `<p class="tip">${t("tools.unavailable")}</p>`;
}

// <select> of programmes, grouped by level and requirement group
function fillProgrammeSelect(select, placeholderKey) {
  const options = DATA.groups.map(g => `<optgroup label="${escapeHtml(t("lvl." + g.level) + " · " + t("grp." + g.code))}">
      ${g.programmes.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
    </optgroup>`).join("");
  select.innerHTML = `<option value="">${t(placeholderKey)}</option>${options}`;
}

// The questions a student must answer for these groups and this qualification
function questionsFor(groups, qualification) {
  const codes = new Set();
  for (const g of groups) {
    const rows = g.requirements.filter(r => r.qualification === qualification);
    if (!rows.length) continue;
    if (rows.some(r => r.field)) codes.add("study_field");
    rows.forEach(r => r.rules.forEach(rule => codes.add(DATA.rules[rule].question)));
    codes.add(DATA.rules[g.englishRule].question);
  }
  const derived = DATA.derived[qualification] || [];
  return QUESTION_ORDER.filter(q => codes.has(q) && !derived.includes(q));
}

// ---------- Results form: qualification, grades or CGPA, and questions ----------
// questionCodes(qualification) returns the questions to ask. Returns { read, fill, refresh }.
function buildResultsForm(box, questionCodes) {
  box.innerHTML = `
    <label class="field"><span>${t("tools.qualification")}</span>
      <select name="qualification" required>
        <option value="">${t("tools.qualification.choose")}</option>
        ${QUAL_ORDER.map(q => `<option value="${q}">${t("q." + q)}</option>`).join("")}
      </select>
    </label>
    <div class="field grades-field" hidden>
      <span>${t("tools.grades")}</span>
      <small>${t("tools.grades.hint")}</small>
      <div class="grade-head"><span>${t("tools.subjectCol")}</span><span>${t("tools.gradeCol")}</span></div>
      <div class="grade-list"></div>
      <button type="button" class="link-btn add-grade">${t("tools.grades.add")}</button>
    </div>
    <label class="field cgpa-field" hidden><span>${t("tools.cgpa")}</span>
      <input type="number" name="cgpa" min="0" max="4" step="0.01" inputmode="decimal">
      <small>${t("tools.cgpa.hint")}</small>
    </label>
    <fieldset class="questions" hidden><legend>${t("tools.questions")}</legend><div class="q-list"></div></fieldset>`;

  const qualSelect = box.querySelector("[name=qualification]");
  const gradesField = box.querySelector(".grades-field");
  const gradeList = box.querySelector(".grade-list");
  const addGrade = box.querySelector(".add-grade");
  const cgpaField = box.querySelector(".cgpa-field");
  const questions = box.querySelector(".questions");
  const answers = {}; // kept when the questions are redrawn

  // One row per subject: [subject] [grade] [x]
  const gradeRow = (subject = "", grade = "") => {
    const q = qualSelect.value;
    const row = document.createElement("div");
    row.className = "grade-row";
    row.innerHTML = `<select class="subject"><option value="">${t("tools.subject.choose")}</option>
        ${DATA.subjects[q].map(c => `<option value="${c}"${c === subject ? " selected" : ""}>${t("sub." + c)}</option>`).join("")}</select>
      <select class="grade"><option value="">—</option>
        ${DATA.scales[q].map(g => `<option${g === grade ? " selected" : ""}>${g}</option>`).join("")}</select>
      <button type="button" class="grade-remove" aria-label="${t("tools.grades.remove")}">✕</button>`;
    row.querySelector(".grade-remove").addEventListener("click", () => { row.remove(); updateGradeButtons(); });
    gradeList.appendChild(row);
  };
  const updateGradeButtons = () => {
    const rows = gradeList.children;
    addGrade.hidden = rows.length >= DATA.maxSubjects;
    [...rows].forEach((row, i) => {
      row.querySelector(".subject").setAttribute("aria-label", fmt(t("tools.subject"), { n: i + 1 }));
      row.querySelector(".grade").setAttribute("aria-label", `${fmt(t("tools.subject"), { n: i + 1 })}: ${t("tools.gradeCol")}`);
      row.querySelector(".grade-remove").hidden = rows.length === 1;
    });
  };
  addGrade.addEventListener("click", () => { gradeRow(); updateGradeButtons(); });

  const drawQuestions = () => {
    const codes = qualSelect.value ? questionCodes(qualSelect.value) : [];
    questions.hidden = !codes.length;
    questions.querySelector(".q-list").innerHTML = codes.map(q => `
      <div class="question" data-q="${q}">
        <p>${t("qq." + q)}</p>
        ${DATA.questions[q].map(o => `<label class="option">
          <input type="radio" name="q_${q}" value="${o}"${answers[q] === o ? " checked" : ""}> <span>${t(`qq.${q}.${o}`)}</span></label>`).join("")}
      </div>`).join("");
    questions.querySelectorAll("input[type=radio]").forEach(r =>
      r.addEventListener("change", () => { answers[r.name.slice(2)] = r.value; }));
  };

  // Redraws the grade boxes when the qualification changes
  const showQualification = (results = null) => {
    const q = qualSelect.value;
    const graded = Boolean(DATA.scales[q]);
    gradesField.hidden = !graded;
    cgpaField.hidden = !q || graded;
    gradeList.innerHTML = "";
    if (graded) {
      const rows = results?.length ? results : STARTER_SUBJECTS[q].map(subject => ({ subject, grade: "" }));
      rows.forEach(r => gradeRow(r.subject, r.grade));
      updateGradeButtons();
    }
    drawQuestions();
  };
  qualSelect.addEventListener("change", () => showQualification());

  return {
    // The form's values in the format the API expects, or null (with a message) when something is missing
    read() {
      const qualification = qualSelect.value;
      if (!qualification) return { error: t("tools.qualification.choose") };
      const input = { qualification, answers: {} };
      if (DATA.scales[qualification]) {
        input.results = [];
        for (const row of gradeList.children) {
          const subject = row.querySelector(".subject").value, grade = row.querySelector(".grade").value;
          if (!subject && !grade) continue; // empty row
          if (!subject || !grade) return { error: t("tools.subject.both") };
          input.results.push({ subject, grade });
        }
        if (!input.results.length) return { error: t("tools.subject.both") };
        const names = input.results.map(r => r.subject).filter(n => n !== "other");
        if (new Set(names).size !== names.length) return { error: t("tools.subject.twice") };
      } else {
        const cgpa = box.querySelector("[name=cgpa]");
        if (cgpa.value === "" || !cgpa.checkValidity()) return { error: `${t("tools.cgpa")}: ${t("tools.cgpa.hint")}` };
        input.cgpa = Number(cgpa.value);
      }
      for (const q of questionCodes(qualification)) {
        if (!answers[q]) return { error: t("tools.required") };
        input.answers[q] = answers[q];
      }
      return { input };
    },
    // Puts saved values back into the form
    fill(saved) {
      if (!saved || !QUAL_ORDER.includes(saved.qualification)) return;
      Object.assign(answers, saved.answers || {});
      qualSelect.value = saved.qualification;
      showQualification(Array.isArray(saved.results) ? saved.results : null);
      if (saved.cgpa != null) box.querySelector("[name=cgpa]").value = saved.cgpa;
    },
    // Call when the questions may have changed (e.g. another programme was chosen)
    refresh: drawQuestions,
  };
}

function saveInput(input) {
  sessionStorage.setItem(SAVED_INPUT, JSON.stringify(input));
}
function savedInput() {
  try { return JSON.parse(sessionStorage.getItem(SAVED_INPUT)); } catch { return null; }
}

// ---------- Showing results ----------
function verdictHtml(verdict) {
  const icon = { likely: "✓", conditional: "!", not_met: "✕", no_route: "→" }[verdict];
  return `<div class="verdict v-${verdict}"><span>${icon}</span><strong>${t("v." + verdict)}</strong></div>`;
}

function itemText(item) {
  if (item.status === "ok") return fmt(t("res.ok"), { label: t("rl." + item.code) });
  return fmt(t("res." + item.code), item.params);
}

function itemsHtml(items, onlyProblems = false) {
  const shown = onlyProblems ? items.filter(i => i.status !== "ok") : items;
  if (!shown.length) return "";
  return `<ul class="checks">${shown.map(i =>
    `<li class="c-${i.status}">${escapeHtml(itemText(i))}</li>`).join("")}</ul>`;
}

function disclaimerHtml() {
  return `<p class="tool-note">${t("tools.disclaimer")}</p>`;
}

// "Ask the assistant" opens the chat window with a question about this programme
function askAboutProgramme(name) {
  if (window.askAssistant) window.askAssistant(fmt(t("tools.ask.q"), { programme: name }));
}

// ---------- Admission Requirement Explainer ----------
function requirementLines(group, row) {
  const lines = [];
  if (row.minGrade) {
    const credit = (row.qualification === "spm" || row.qualification === "olevel") && row.minGrade === "C";
    lines.push(fmt(t(credit ? "ex.credits" : "ex.grades"), { grade: row.minGrade, count: row.minSubjects }));
  } else {
    lines.push(fmt(t("ex.cgpa"), { min: row.minCgpa.toFixed(2) }));
    if (row.reviewCgpa != null) lines.push(fmt(t("ex.review"), { review: row.reviewCgpa.toFixed(2) }));
  }
  row.rules.forEach(rule => lines.push(t("ex." + rule)));
  return lines;
}

function explainerHtml(programme) {
  const group = groupOfProgramme(programme.id);
  const rows = QUAL_ORDER.flatMap(q => group.requirements.filter(r => r.qualification === q));
  const label = row => {
    const sameQual = group.requirements.filter(r => r.qualification === row.qualification);
    const field = row.field ? fmt(t("ex.field"), { field: t("f." + row.field) })
      : sameQual.some(r => r.field) ? t("ex.anyfield") : "";
    return t("q." + row.qualification) + (field ? ` <small>(${field})</small>` : "");
  };
  const foundation = group.foundationGroup && groupByCode(group.foundationGroup);
  return `
    <article class="result-card">
      <p class="eyebrow">${t("lvl." + group.level)} · ${t("grp." + group.code)}</p>
      <h2>${escapeHtml(programme.name)}</h2>
      <table class="req-table">
        <tbody>
          ${rows.map(r => `<tr><th scope="row">${label(r)}</th>
            <td><ul>${requirementLines(group, r).map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul></td></tr>`).join("")}
          <tr><th scope="row">${t("ex.english")}</th><td>${t("ex." + group.englishRule)}</td></tr>
        </tbody>
      </table>
      ${foundation ? `<p class="tip">${fmt(t("ex.spmNote"), { foundation: `<a class="text-link" href="explainer.html?p=${foundation.programmes[0].id}">${escapeHtml(foundation.programmes[0].name)}</a>` })}</p>` : ""}
      <p class="tool-note">${t("ex.other")}</p>
      <p class="source">${t("tools.source")} <a href="${group.sourceUrl}" target="_blank" rel="noopener">${t("tools.official")} ↗</a></p>
      <div class="tool-actions">
        <a class="btn btn-dark" href="eligibility.html?p=${programme.id}">${t("tools.toChecker")}</a>
        <button type="button" class="btn btn-outline" data-ask>${t("tools.ask")}</button>
      </div>
    </article>`;
}

async function initExplainer() {
  const root = document.getElementById("tool");
  try { await loadAdmissionData(); } catch { return showUnavailable(root); }
  const select = document.getElementById("programme");
  const out = document.getElementById("result");
  fillProgrammeSelect(select, "tools.programme.choose");
  document.getElementById("coverage").innerHTML = fmt(t("tools.coverage"), { count: programmeCount() });
  const show = () => {
    const programme = programmeById(select.value);
    out.innerHTML = programme ? explainerHtml(programme) : "";
    if (programme) {
      out.querySelector("[data-ask]").addEventListener("click", () => askAboutProgramme(programme.name));
      history.replaceState(null, "", `?p=${programme.id}`);
    }
  };
  select.addEventListener("change", show);
  const p = new URLSearchParams(location.search).get("p");
  if (p && programmeById(p)) { select.value = p; show(); }
}

// ---------- Smart Eligibility Checker ----------
function checkerQuestions(programmeId, qualification) {
  const group = groupOfProgramme(programmeId);
  if (!group) return [];
  const direct = group.requirements.some(r => r.qualification === qualification);
  // SPM / O-Level students go through a Foundation programme, so ask that programme's questions
  const groups = !direct && group.foundationGroup ? [groupByCode(group.foundationGroup)] : [group];
  return questionsFor(groups, qualification);
}

function checkerResultHtml(programme, result) {
  let html = verdictHtml(result.verdict) + itemsHtml(result.items);
  if (result.foundation) {
    const f = result.foundation;
    html += `<p class="tip">${fmt(t("res.foundation"), { foundation: escapeHtml(f.programme) })}</p>`
      + verdictHtml(f.verdict) + itemsHtml(f.items);
  }
  return `<article class="result-card">
      <p class="eyebrow">${t("grp." + result.group)}</p>
      <h2>${escapeHtml(programme.name)}</h2>
      ${html}
      ${disclaimerHtml()}
      <div class="tool-actions">
        <a class="btn btn-dark" href="pathway.html?p=${programme.id}">${t("tools.toPathway")}</a>
        <a class="btn btn-outline" href="explainer.html?p=${programme.id}">${t("tools.explain")}</a>
        <button type="button" class="btn btn-outline" data-ask>${t("tools.ask")}</button>
      </div>
    </article>`;
}

async function initChecker() {
  const root = document.getElementById("tool");
  try { await loadAdmissionData(); } catch { return showUnavailable(root); }
  const select = document.getElementById("programme");
  const form = document.getElementById("toolForm");
  const error = document.getElementById("formError");
  const out = document.getElementById("result");
  fillProgrammeSelect(select, "tools.programme.choose");
  document.getElementById("coverage").innerHTML = fmt(t("tools.coverage"), { count: programmeCount() });

  const results = buildResultsForm(document.getElementById("resultsForm"), q => checkerQuestions(select.value, q));
  select.addEventListener("change", () => { results.refresh(); out.innerHTML = ""; });
  const p = new URLSearchParams(location.search).get("p");
  if (p && programmeById(p)) select.value = p;
  results.fill(savedInput());

  form.addEventListener("submit", async e => {
    e.preventDefault();
    error.textContent = "";
    const programme = programmeById(select.value);
    if (!programme) { error.textContent = t("tools.programme.choose"); return; }
    const { input, error: problem } = results.read();
    if (problem) { error.textContent = problem; return; }
    saveInput(input);
    try {
      const result = await postJson("/api/eligibility", { programmeId: programme.id, ...input });
      out.innerHTML = checkerResultHtml(programme, result);
      out.querySelector("[data-ask]").addEventListener("click", () => askAboutProgramme(programme.name));
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      error.textContent = err.message.startsWith("HTTP") ? t("tools.unavailable") : err.message;
    }
  });
}

// ---------- Alternative Pathway Recommendation ----------
function optionCardHtml(option) {
  const leadsTo = option.level === "foundation"
    ? DATA.groups.filter(g => g.foundationGroup === option.group).map(g => t("grp." + g.code))
    : [];
  return `<article class="option-card">
      <div class="option-head">
        <h3>${t("grp." + option.group)}</h3>
        <span class="badge b-${option.verdict}">${t("b." + option.verdict)}</span>
      </div>
      ${leadsTo.length ? `<p class="leads">${escapeHtml(fmt(t("pw.leadsTo"), { groups: leadsTo.join(", ") }))}</p>` : ""}
      ${itemsHtml(option.items, true)}
      <details>
        <summary>${fmt(t("pw.programmes"), { count: option.programmes.length })}</summary>
        <ul class="plain-list">${option.programmes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </details>
    </article>`;
}

function pathwayResultHtml(result, programme) {
  const foundations = result.options.filter(o => o.level === "foundation");
  const degrees = result.options.filter(o => o.level === "bachelor");
  let html = "";
  if (result.target && programme) {
    html += `<section class="result-card">
        <p class="eyebrow">${t("pw.target")}</p>
        <h2>${escapeHtml(programme.name)}</h2>
        ${verdictHtml(result.target.verdict)}${itemsHtml(result.target.items, true)}
      </section>`;
  }
  if (foundations.length) {
    html += `<h2 class="tool-h">${t("pw.foundation")}</h2><p>${t("pw.foundation.sub")}</p>
      <div class="option-grid">${foundations.map(optionCardHtml).join("")}</div>`;
  }
  if (degrees.length) {
    html += `<h2 class="tool-h">${t("pw.options")}</h2><p>${t("pw.options.sub")}</p>
      <div class="option-grid">${degrees.map(optionCardHtml).join("")}</div>`;
  }
  if (!result.options.length) html += `<p class="tip">${t("pw.none")}</p>`;
  html += `<h2 class="tool-h">${t("pw.more")}</h2>
    <ul class="plain-list">
      <li>${t("pw.more.1")}</li>
      <li>${t("pw.more.2")}</li>
      <li>${t("pw.more.3")} <a class="text-link" href="https://admission.utar.edu.my/Undergraduate-Programmes-by-Clusters-MER.php" target="_blank" rel="noopener">${t("tools.official")} ↗</a></li>
    </ul>
    ${disclaimerHtml()}`;
  return html;
}

async function initPathway() {
  const root = document.getElementById("tool");
  try { await loadAdmissionData(); } catch { return showUnavailable(root); }
  const select = document.getElementById("programme");
  const form = document.getElementById("toolForm");
  const error = document.getElementById("formError");
  const out = document.getElementById("result");
  fillProgrammeSelect(select, "tools.programme.none");
  document.getElementById("coverage").innerHTML = fmt(t("tools.coverage"), { count: programmeCount() });

  // Every programme is checked, so ask every question that applies to the qualification
  const results = buildResultsForm(document.getElementById("resultsForm"), q => questionsFor(DATA.groups, q));
  const p = new URLSearchParams(location.search).get("p");
  if (p && programmeById(p)) select.value = p;
  const saved = savedInput();
  results.fill(saved);

  const run = async () => {
    error.textContent = "";
    const { input, error: problem } = results.read();
    if (problem) { error.textContent = problem; return; }
    saveInput(input);
    const programme = programmeById(select.value);
    try {
      const result = await postJson("/api/pathways", { ...input, programmeId: programme?.id });
      out.innerHTML = pathwayResultHtml(result, programme);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      error.textContent = err.message.startsWith("HTTP") ? t("tools.unavailable") : err.message;
    }
  };
  form.addEventListener("submit", e => { e.preventDefault(); run(); });
  // Coming from the checker with results already entered: show the pathways straight away
  if (saved && p && !results.read().error) run();
}
