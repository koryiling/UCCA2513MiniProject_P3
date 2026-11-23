// Fees and scholarship pages (Module 3): the fee table (fees.html), the Top Achievers tiers and other scholarships
// (scholarship.html), and example questions that open the chatbot. Scholarship checks and cost estimates are
// answered by the chatbot (server/finance.js); these pages only show the reference tables.
// The data comes from MySQL through the backend (GET /api/finance-data).
// Load after i18n.js, i18n-finance.js and script.js.

let FIN = null;
const FIN_QUALS = ["stpm", "alevel", "uec", "foundation", "diploma", "spm", "olevel"];

async function loadFinance() {
  const res = await fetch("/api/finance-data");
  if (!res.ok) throw new Error("HTTP " + res.status);
  FIN = await res.json();
  return FIN;
}

const finDate = d => {
  const [y, m, day] = String(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString({ en: "en-GB", zh: "zh-CN", ms: "ms-MY" }[getLang()],
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};
const sourceLine = (src, linkKey = "fin.source.link") => `<p class="source">${finFmt(t("fin.source"), {
  link: `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">${t(linkKey)} ↗</a>`,
  date: finDate(src.lastChecked),
})}</p>`;

function finUnavailable(root) {
  root.innerHTML = `<p class="tip">${t("fin.unavailable")}</p>`;
}

// ---------- fees.html ----------

function renderFeeTable(box) {
  const campuses = [...new Set(FIN.programmes.map(p => p.campus))].sort();
  const checked = FIN.programmes[0]?.lastChecked;
  box.innerHTML = `
    <div class="tool-actions">
      <label class="field"><span>${t("fin.search")}</span>
        <input type="search" id="feeSearch" placeholder="${escapeHtml(t("fin.search.ph"))}"></label>
      <label class="field"><span>${t("fin.campus")}</span>
        <select id="feeCampus"><option value="">${t("fin.campus.all")}</option>
          ${campuses.map(c => `<option>${escapeHtml(c)}</option>`).join("")}</select></label>
    </div>
    <p class="tool-note" id="feeCount"></p>
    <div class="table-wrap"><table class="dates">
      <thead><tr><th>${t("fin.th.programme")}</th><th>${t("fin.th.campus")}</th><th>${t("fin.th.duration")}</th>
        <th>${t("fin.th.my")}</th><th>${t("fin.th.intl")}</th></tr></thead>
      <tbody id="feeRows"></tbody>
    </table></div>
    <p class="source">${finFmt(t("fin.table.note"), { date: checked ? finDate(checked) : "" })}</p>`;
  const search = box.querySelector("#feeSearch");
  const campus = box.querySelector("#feeCampus");
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const list = FIN.programmes.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!campus.value || p.campus === campus.value));
    box.querySelector("#feeCount").textContent = finFmt(t("fin.table.count"), { n: list.length, total: FIN.programmes.length });
    box.querySelector("#feeRows").innerHTML = list.length
      ? list.map(p => `<tr><td><a class="text-link" href="${escapeHtml(p.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a></td>
          <td>${escapeHtml(p.campus)}</td><td>${finFmt(t("fin.years"), { n: p.durationYears })}</td>
          <td>${p.feeMalaysian.toLocaleString("en-MY")}</td><td>${p.feeInternational.toLocaleString("en-MY")}</td></tr>`).join("")
      : `<tr><td colspan="5">${t("fin.table.none")}</td></tr>`;
  };
  search.addEventListener("input", draw);
  campus.addEventListener("change", draw);
  draw();
}

// Example questions: clicking one opens the chatbot and asks it (window.askAssistant in script.js)
function renderAskChips(box, keys) {
  box.innerHTML = `<p class="muted">${t("fin.ask.sub")}</p><div class="quick-replies">${keys.map(k =>
    `<button type="button" class="chip" data-q="${escapeHtml(t(k))}">${escapeHtml(t(k))}</button>`).join("")}</div>`;
  box.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => window.askAssistant?.(b.dataset.q)));
}

async function initFees() {
  renderAskChips(document.getElementById("askFees"), ["fin.ask.f1", "fin.ask.f2", "fin.ask.f3", "fin.ask.f4"]);
  const table = document.getElementById("feeTable");
  try {
    await loadFinance();
  } catch {
    finUnavailable(table);
    return;
  }
  renderFeeTable(table);
}

// ---------- scholarship.html ----------

function tierLabel(tr) {
  if (tr.resultType === "cgpa") return tr.max ? `CGPA ${tr.min.toFixed(4)}–${tr.max.toFixed(4)}` : `≥ CGPA ${tr.min.toFixed(4)}`;
  return finFmt(t(tr.conditions.includes("a_plus_a_only") ? "fin.tiers.aplus" : "fin.tiers.as"), { n: tr.min });
}

// The official tables: one row per qualification, one column per waiver
function renderTiers(box) {
  const table = level => {
    const tiers = FIN.tiers.filter(tr => tr.studyLevel === level);
    const waivers = [...new Set(tiers.map(tr => tr.waiver))].sort((a, b) => b - a);
    const quals = FIN_QUALS.filter(q => tiers.some(tr => tr.qualification === q));
    return `<h3 class="tool-h">${t("fin.tiers." + level)}</h3>
      <div class="table-wrap"><table class="dates">
        <thead><tr><th>${t("fin.tiers.ach")}</th>${waivers.map(w => `<th>${w}%</th>`).join("")}</tr></thead>
        <tbody>${quals.map(q => `<tr><td>${t("fin.q." + q)}${tiers.some(tr => tr.qualification === q && tr.conditions.includes("straight_passes")) ? " *" : ""}</td>
          ${waivers.map(w => {
            const list = tiers.filter(tr => tr.qualification === q && tr.waiver === w);
            return `<td>${list.length ? list.map(tierLabel).join("<br>") : "–"}</td>`;
          }).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
  };
  const src = FIN.tiers[0] && { url: FIN.tiers[0].sourceUrl, lastChecked: FIN.tiers[0].lastChecked };
  box.innerHTML = table("bachelor") + table("foundation") +
    `<p class="tool-note">${t("fin.tiers.straight")} ${t("fin.tiers.own")}</p>` + (src ? sourceLine(src, "fin.dsfa") : "");
}

function renderOtherScholarships(box) {
  box.innerHTML = `<div class="grid-3">${FIN.scholarships.map(s => `
    <div class="info-box">
      <span class="tag">${t("fin.kind." + s.kind)}</span>
      <h3>${escapeHtml(s.name)}</h3>
      <p class="muted">${[s.forFoundation && t("fin.level.foundation"), s.forBachelor && t("fin.level.bachelor")].filter(Boolean).join(" · ")}</p>
      <p>${t("fin.apply." + s.appliesBy)}</p>
      <a class="text-link" href="${escapeHtml(s.sourceUrl)}" target="_blank" rel="noopener">${t("fin.details")} ↗</a>
    </div>`).join("")}</div>`;
}

async function initScholarship() {
  renderAskChips(document.getElementById("askSch"), ["fin.ask.s1", "fin.ask.s2", "fin.ask.s3", "fin.ask.s4"]);
  try {
    await loadFinance();
  } catch {
    finUnavailable(document.getElementById("tiers"));
    finUnavailable(document.getElementById("others"));
    return;
  }
  renderTiers(document.getElementById("tiers"));
  renderOtherScholarships(document.getElementById("others"));
}
