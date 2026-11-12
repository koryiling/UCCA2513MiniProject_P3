// Application tools for logged-in students: Personalized Document Checklist (checklist.html),
// Application Journey Tracker (tracker.html), Application Date & Reminder (dates.html),
// and the "My progress" summary on application.html.
// Everything is saved on the server under the student's account (server/application.js, /api/app/...).
// Load after i18n.js, i18n-app.js and script.js.

// Calls the backend. A 401 means the login has ended: go to the login page and come back afterwards.
async function api(method, url, body) {
  const res = await fetch("/api/app" + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("uaa_user");
    const here = location.pathname.split("/").pop() || "application.html";
    location.replace(`login.html?next=${encodeURIComponent(here)}`);
    throw new Error("login");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "HTTP " + res.status), { status: res.status, data });
  return data;
}

function showToolError(root) {
  root.innerHTML = `<p class="tip">${t("at.unavailable")}</p>`;
}

// "2027-01-25" -> "25 January 2027" in the page language
function formatDate(iso) {
  const locale = { en: "en-GB", zh: "zh-CN", ms: "ms-MY" }[getLang()];
  return new Date(iso + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

// Whole days from one "YYYY-MM-DD" date to another
function daysBetween(from, to) {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}

function countdownText(today, date) {
  const n = daysBetween(today, date);
  if (n === 0) return t("dt.isToday");
  if (n === 1) return t("dt.tomorrow");
  return n > 0 ? fmt(t("dt.inDays"), { n }) : fmt(t("dt.daysAgo"), { n: -n });
}

function reminderText(r) {
  return r.kind === "custom" ? r.title : fmt(t("dt.k." + r.kind), { intake: t("dt.i." + r.intake) });
}

function progressHtml(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar" style="width:${pct}%"></div></div>
    <p class="progress-text">${escapeHtml(label)}</p>`;
}

// ---------- Personalized Document Checklist ----------
const PROFILE_FIELDS = {
  nationality: ["malaysian", "international"],
  qualification: ["school", "preu", "foundation", "diploma", "degree"],
  programme_type: ["general", "mbbs", "nursing", "architecture", "art"],
  english_test: [true, false],
  credit_transfer: [true, false],
};

function profileFormHtml(profile) {
  const value = (field, option) => (profile && profile[field] === option ? " checked" : "");
  const label = (field, option) => typeof option === "boolean" ? t(option ? "pf.yes" : "pf.no") : t(`pf.${field}.${option}`);
  return `<form class="tool-form profile-form" novalidate>
      <h2>${t("pf.h")}</h2>
      <p class="muted">${t("pf.sub")}</p>
      ${Object.entries(PROFILE_FIELDS).map(([field, options]) => `
        <div class="question" data-field="${field}">
          <p>${t("pf." + field)}</p>
          ${options.map(o => `<label class="option"><input type="radio" name="${field}" value="${o}"${value(field, o)}> <span>${label(field, o)}</span></label>`).join("")}
        </div>`).join("")}
      <p class="error" role="alert"></p>
      <div class="tool-actions">
        <button type="submit" class="btn btn-dark">${t("pf.save")}</button>
        ${profile ? `<button type="button" class="btn btn-outline" data-cancel>${t("pf.cancel")}</button>` : ""}
      </div>
    </form>`;
}

async function initChecklist() {
  const root = document.getElementById("tool");
  let data;
  try { data = await api("GET", "/checklist"); } catch (err) { if (err.message !== "login") showToolError(root); return; }

  const showForm = () => {
    root.innerHTML = profileFormHtml(data.profile);
    const form = root.querySelector("form");
    // Credit transfer only applies to students with a diploma or degree
    const ctQuestion = form.querySelector('[data-field="credit_transfer"]');
    const updateCt = () => {
      const q = form.querySelector("[name=qualification]:checked")?.value;
      ctQuestion.hidden = !(q === "diploma" || q === "degree");
    };
    form.addEventListener("change", updateCt);
    updateCt();
    form.querySelector("[data-cancel]")?.addEventListener("click", showList);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const body = { target_intake: data.profile?.target_intake || null };
      for (const field of Object.keys(PROFILE_FIELDS)) {
        const checked = form.querySelector(`[name=${field}]:checked`);
        if (field === "credit_transfer" && ctQuestion.hidden) { body[field] = false; continue; }
        if (!checked) { form.querySelector(".error").textContent = t("pf.required"); return; }
        body[field] = checked.value === "true" ? true : checked.value === "false" ? false : checked.value;
      }
      try {
        await api("PUT", "/profile", body);
        data = await api("GET", "/checklist");
        showList();
      } catch (err) {
        if (err.message !== "login") form.querySelector(".error").textContent = t("at.error");
      }
    });
  };

  const showList = () => {
    const items = data.items;
    const group = phase => items.filter(i => i.phase === phase).map(i => `
      <li><label class="check-item">
        <input type="checkbox" data-code="${i.code}"${i.done ? " checked" : ""}>
        <span>${t("cl." + i.code)}${I18N.en["cl." + i.code + ".hint"] ? `<small>${t("cl." + i.code + ".hint")}</small>` : ""}</span>
      </label></li>`).join("");
    const p = data.profile;
    root.innerHTML = `
      <div class="result-card">
        <div class="summary-row">
          <div>
            <p class="eyebrow">${t("pf.h")}</p>
            <p class="profile-summary">${[t("pf.nationality." + p.nationality), t("pf.qualification." + p.qualification), t("pf.programme_type." + p.programme_type)].map(escapeHtml).join(" · ")}</p>
          </div>
          <button type="button" class="btn btn-outline" data-edit>${t("pf.edit")}</button>
        </div>
        <div id="clProgress"></div>
      </div>
      <section class="result-card">
        <h2>${t("cl.apply.h")}</h2>
        <p class="muted">${t("cl.apply.sub")}</p>
        <ul class="check-list">${group("apply")}</ul>
      </section>
      <section class="result-card">
        <h2>${t("cl.orientation.h")}</h2>
        <p class="muted">${t("cl.orientation.sub")}</p>
        <ul class="check-list">${group("orientation")}</ul>
      </section>
      <p class="source">${t("cl.source")}</p>`;
    const updateProgress = () => {
      const done = items.filter(i => i.done).length;
      document.getElementById("clProgress").innerHTML = progressHtml(done, items.length,
        done === items.length ? t("cl.allDone") : fmt(t("cl.progress"), { done, total: items.length }));
    };
    updateProgress();
    root.querySelector("[data-edit]").addEventListener("click", showForm);
    root.querySelectorAll("input[data-code]").forEach(box => box.addEventListener("change", async () => {
      const item = items.find(i => i.code === box.dataset.code);
      item.done = box.checked;
      updateProgress();
      try {
        await api("PUT", "/checklist/" + item.code, { done: item.done });
      } catch (err) {
        if (err.message === "login") return;
        item.done = box.checked = !box.checked; // undo on failure
        updateProgress();
        toast(t("at.error"));
      }
    }));
  };

  data.profile ? showList() : showForm();
}

// ---------- Application Journey Tracker ----------
const STAGE_LINKS = {
  explore: ["explainer.html", "tr.explore.link"],
  eligibility: ["eligibility.html", "tr.eligibility.link"],
  documents: ["checklist.html", "tr.documents.link"],
  submit: ["https://admission.utar.edu.my/Apply_Now.php", "tr.submit.link"],
  accept: ["dates.html#add", "tr.accept.link"],
};

async function initTracker() {
  const root = document.getElementById("tool");
  let stages, checklist;
  try {
    [{ stages }, checklist] = await Promise.all([api("GET", "/journey"), api("GET", "/checklist")]);
  } catch (err) { if (err.message !== "login") showToolError(root); return; }

  const draw = () => {
    const done = stages.filter(s => s.doneOn).length;
    const next = stages.find(s => !s.doneOn)?.code;
    const docs = checklist.items.length
      ? ` <span class="badge b-likely">${fmt(t("cl.progress"), { done: checklist.items.filter(i => i.done).length, total: checklist.items.length })}</span>`
      : "";
    root.innerHTML = `
      <div class="result-card">${progressHtml(done, stages.length, fmt(t("tr.progress"), { done, total: stages.length }))}</div>
      <ol class="journey">
        ${stages.map((s, i) => {
          const link = STAGE_LINKS[s.code];
          const external = link && link[0].startsWith("http");
          return `<li class="stage${s.doneOn ? " done" : ""}${s.code === next ? " current" : ""}">
            <span class="stage-dot">${s.doneOn ? "✓" : i + 1}</span>
            <div class="stage-body">
              ${s.code === next ? `<p class="eyebrow">${t("tr.next")}</p>` : ""}
              <h3>${t(`tr.${s.code}.h`)}${s.code === "documents" ? docs : ""}</h3>
              <p>${t(`tr.${s.code}.p`)}</p>
              <div class="stage-actions">
                ${link ? `<a class="text-link" href="${link[0]}"${external ? ' target="_blank" rel="noopener"' : ""}>${t(link[1])}</a>` : ""}
                ${s.doneOn
                  ? `<span class="muted">${fmt(t("tr.doneOn"), { date: formatDate(s.doneOn) })}</span>
                     <button type="button" class="link-btn" data-stage="${s.code}" data-done="false">${t("tr.undo")}</button>`
                  : `<button type="button" class="btn btn-outline btn-sm" data-stage="${s.code}" data-done="true">${t("tr.markDone")}</button>`}
              </div>
            </div>
          </li>`;
        }).join("")}
      </ol>
      <p class="source">${t("tr.source")}</p>`;
    root.querySelectorAll("[data-stage]").forEach(btn => btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        ({ stages } = await api("PUT", "/journey/" + btn.dataset.stage, { done: btn.dataset.done === "true" }));
        draw();
      } catch (err) {
        if (err.message !== "login") { btn.disabled = false; toast(t("at.error")); }
      }
    }));
  };
  draw();
}

// ---------- Application Date & Reminder ----------
// A calendar file (.ics) with all the reminders, each with an alert one day before
function downloadIcs(reminders) {
  const esc = s => String(s).replace(/[\\,;]/g, c => "\\" + c).replace(/\n/g, " ");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events = reminders.map((r, i) => {
    const day = r.date.replace(/-/g, "");
    const next = new Date(r.date + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    return ["BEGIN:VEVENT", `UID:uaa-${day}-${i}@utar-admission-assistant`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`,
      `SUMMARY:${esc(reminderText(r))}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(reminderText(r))}`,
      "TRIGGER:-P1D", "END:VALARM", "END:VEVENT"].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UTAR Admission Assistant//EN", ...events, "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "utar-reminders.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function initDates() {
  const root = document.getElementById("tool");
  let data, hasProfile;
  try {
    [data, { profile: hasProfile }] = await Promise.all([api("GET", "/dates"), api("GET", "/profile")]);
  } catch (err) { if (err.message !== "login") showToolError(root); return; }

  const draw = () => {
    const today = data.today;
    root.innerHTML = `
      <p class="muted">${fmt(t("dt.today"), { date: formatDate(today) })}</p>
      <section class="result-card">
        <h2>${t("dt.intakes.h")}</h2>
        <div class="table-wrap"><table class="dates intake-table">
          <thead><tr><th>${t("dt.col.intake")}</th><th>${t("dt.col.for")}</th><th>${t("dt.col.date")}</th><th>${t("dt.col.when")}</th><th></th></tr></thead>
          <tbody>${data.intakes.map(i => `<tr${i.code === data.targetIntake ? ' class="chosen"' : ""}>
            <td class="intake-name">${t("dt.i." + i.code)}</td>
            <td>${t("dt.a." + i.appliesTo)}</td>
            <td data-label="${t("dt.col.date")}">${i.date ? formatDate(i.date) : t("dt.tba")}</td>
            <td data-label="${t("dt.col.when")}">${i.date ? countdownText(today, i.date) : "—"}</td>
            <td class="intake-action">${!hasProfile ? "" : i.code === data.targetIntake
              ? `<span class="badge b-likely">${t("dt.chosen")}</span>`
              : `<button type="button" class="btn btn-outline btn-sm" data-intake="${i.code}">${t("dt.choose")}</button>`}</td>
          </tr>`).join("")}</tbody>
        </table></div>
        <p class="source">${t("dt.closing")} ${t("dt.source")}</p>
        ${hasProfile ? "" : `<p class="tip">${t("dt.noProfile")} <a class="text-link" href="checklist.html">${t("tr.documents.link")}</a></p>`}
      </section>
      <section class="result-card">
        <h2>${t("dt.rem.h")}</h2>
        ${data.reminders.length ? `<ul class="reminders">${data.reminders.map(r => {
          const n = daysBetween(today, r.date);
          return `<li class="${n < 0 ? "past" : n <= 7 ? "soon" : ""}">
            <span class="r-date">${formatDate(r.date)}<small>${countdownText(today, r.date)}</small></span>
            <span class="r-text">${escapeHtml(reminderText(r))}</span>
            ${r.kind === "custom" ? `<button type="button" class="link-btn" data-delete="${r.id}">${t("dt.delete")}</button>` : ""}
          </li>`;
        }).join("")}</ul>
          <button type="button" class="btn btn-outline" data-ics>${t("dt.ics")}</button>
          <p class="source">${t("dt.ics.hint")}</p>` : `<p class="muted">${t("dt.rem.none")}</p>`}
      </section>
      <section class="result-card" id="add">
        <h2>${t("dt.add.h")}</h2>
        <form class="reminder-form" novalidate>
          <label class="field"><span>${t("dt.add.title")}</span><input name="title" maxlength="120" placeholder="${t("dt.add.ph")}"></label>
          <label class="field"><span>${t("dt.add.date")}</span><input name="date" type="date"></label>
          <button type="submit" class="btn btn-dark">${t("dt.add.btn")}</button>
        </form>
        <p class="error" role="alert"></p>
      </section>`;

    const save = async (method, url, body) => {
      try { data = await api(method, url, body); draw(); return true; }
      catch (err) { if (err.message !== "login") toast(t("at.error")); return false; }
    };
    root.querySelectorAll("[data-intake]").forEach(b => b.addEventListener("click", () => save("PUT", "/dates/intake", { target_intake: b.dataset.intake })));
    root.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => save("DELETE", "/reminders/" + b.dataset.delete)));
    root.querySelector("[data-ics]")?.addEventListener("click", () => downloadIcs(data.reminders));
    const form = root.querySelector(".reminder-form");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const title = form.title.value.trim(), date = form.date.value;
      if (!title || !date) { root.querySelector("#add .error").textContent = t("dt.add.err"); return; }
      await save("POST", "/reminders", { title, date });
    });
  };
  draw();
  if (location.hash === "#add") document.getElementById("add").scrollIntoView();
}

// ---------- "My progress" on application.html ----------
async function initDashboard() {
  const box = document.getElementById("dashboard");
  if (!box) return;
  let d;
  try { d = await api("GET", "/dashboard"); } catch { box.hidden = true; return; }
  const nextStep = d.journey.next ? fmt(t("db.next"), { step: t(`tr.${d.journey.next}.h`) }) : t("db.allDone");
  box.innerHTML = `
    <h2>${t("db.h")}</h2>
    <p>${escapeHtml(fmt(t("db.hi"), { name: d.user.name }))}</p>
    <div class="grid-3 dash-grid">
      <a class="info-box dash-card" href="checklist.html">
        <h3>🗂️ ${t("db.checklist")}</h3>
        ${d.hasProfile ? progressHtml(d.checklist.done, d.checklist.total, `${d.checklist.done} / ${d.checklist.total}`)
          : `<p>${t("db.noProfile")}</p><span class="m-link">${t("db.setup")} →</span>`}
      </a>
      <a class="info-box dash-card" href="tracker.html">
        <h3>📍 ${t("db.journey")}</h3>
        ${progressHtml(d.journey.done, d.journey.total, `${d.journey.done} / ${d.journey.total}`)}
        <p>${nextStep}</p>
      </a>
      <a class="info-box dash-card" href="dates.html">
        <h3>📅 ${t("db.upcoming")}</h3>
        ${d.upcoming.length ? `<ul class="plain-list">${d.upcoming.slice(0, 3).map(r =>
          `<li><b>${formatDate(r.date)}</b> · ${escapeHtml(reminderText(r))}</li>`).join("")}</ul>` : `<p>${t("db.noUpcoming")}</p>`}
      </a>
    </div>`;
}
