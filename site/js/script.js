// Shared layout and chatbot for every page.
// Each page sets <body data-page="home|admission|application|fees|scholarship|student-life|faq"> to highlight its menu item.
// Text comes from js/i18n.js (t() function), which must be loaded before this file.

// ---------- Login state ----------
// Prototype only: the logged-in user is kept in localStorage.
// In the full system the Node.js backend will manage login sessions.
function getUser() {
  try { return JSON.parse(localStorage.getItem("uaa_user")); } catch { return null; }
}

// ---------- Header & footer ----------
function renderLayout() {
  const page = document.body.dataset.page;
  const user = getUser();

  // The Application section is for students who are ready to apply, so it requires login.
  // Information pages stay open to everyone, and there is no Login button in the header.
  if (page === "application" && !user) {
    location.replace(`login.html?next=${encodeURIComponent("application.html" + location.hash)}`);
    return false;
  }
  const nav = [
    ["home", "index.html", t("nav.home")],
    ["admission", "admission.html", t("nav.admission")],
    ["application", "application.html", t("nav.application")],
    ["fees", "fees.html", t("nav.fees")],
    ["scholarship", "scholarship.html", t("nav.scholarship")],
    ["student-life", "student-life.html", t("nav.life"), [
      ["student-life.html#campus", t("nav.campus")],
      ["student-life.html#faculty", t("nav.faculty")],
      ["student-life.html#facilities", t("nav.facilities")],
    ]],
  ];

  const navItem = ([id, href, label, sub]) => {
    const cls = id === page ? ' class="active"' : "";
    if (!sub) return `<a href="${href}"${cls}>${label}</a>`;
    return `<div class="has-sub">
      <a href="${href}"${cls}>${label} <span class="caret">▾</span></a>
      <div class="submenu">${sub.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</div>
    </div>`;
  };

  document.getElementById("site-header").outerHTML = `
    <header class="site-header">
      <div class="top-bar"><div class="container">${langSwitchHtml()}</div></div>
      <div class="container header-inner">
        <a href="index.html" class="brand">
          <img class="logo" src="images/logo.jpg" alt="UTAR logo">
          <span class="brand-name">Universiti Tunku Abdul Rahman</span>
        </a>
        <button class="menu-toggle" aria-label="Open menu">☰</button>
        <nav class="main-nav">
          ${nav.map(navItem).join("")}
        </nav>
        ${user
          ? `<span class="user-menu"><span class="user-name">${t("user.hi")} ${escapeHtml(user.name)}</span><button class="btn btn-outline" id="logoutBtn">${t("user.logout")}</button></span>`
          : ""}
      </div>
    </header>`;

  document.getElementById("site-footer").outerHTML = `
    <footer class="site-footer">
      <div class="container footer-center">
        <p class="footer-copy">© ${new Date().getFullYear()} UNIVERSITI TUNKU ABDUL RAHMAN <em>DU012(A).</em></p>
        <p class="footer-owner">${t("footer.owner")} <em>(200201010564(578227-M))</em>
          <span class="footer-legal">
            <span>${t("footer.legal")}</span>
            <span>${t("footer.terms")}</span>
            <span>${t("footer.privacy")}</span>
          </span>
        </p>
        <nav class="footer-quick">
          ${[...nav.map(([, href, label]) => [href, label]), ["faq.html", t("nav.faq")]]
            .map(([href, label]) => `<a href="${href}">${label}</a>`).join("<span>|</span>")}
        </nav>
      </div>
    </footer>`;

  const logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", () => {
    localStorage.removeItem("uaa_user");
    location.href = "index.html";
  });

  document.querySelector(".menu-toggle").addEventListener("click", () =>
    document.querySelector(".main-nav").classList.toggle("open")
  );
}

// ---------- Toast ----------
function toast(text) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------- Chatbot (pop-up window) ----------
// Answers come from the Node.js backend (POST /api/chat), which looks them up in MySQL.
// Start the backend with "npm start" and open http://localhost:3000.
async function askServer(message, lang) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, lang }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return (await res.json()).reply;
}

function renderChat() {
  const lang = getLang();
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="chat-popup" id="chat" aria-hidden="true">
      <div class="chat-head">
        <span class="bot-avatar">🤖</span>
        <strong>${t("chat.title")}</strong>
        <span class="status"><i></i>${t("chat.online")}</span>
        <button class="chat-close" aria-label="Close chat">✕</button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-suggest" id="chatSuggest"><p>${t("chat.suggested")}</p></div>
      <form class="chat-input" id="chatForm" autocomplete="off">
        <input id="chatInput" type="text" placeholder="${t("chat.placeholder")}" aria-label="Your question">
        <button type="submit" class="send" aria-label="Send">➤</button>
      </form>
    </div>
    <button class="chat-fab" data-open-chat aria-label="Open chat">💬</button>`;
  document.body.append(...wrap.children);

  const chat = document.getElementById("chat");
  const body = document.getElementById("chatBody");
  const input = document.getElementById("chatInput");

  const add = (html, who) => {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    if (who === "user") div.textContent = html; else div.innerHTML = html;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };
  const ask = async q => {
    if (!q.trim()) return;
    add(q, "user");
    try {
      add(await askServer(q, lang), "bot");
    } catch {
      add(t("chat.offline"), "bot");
    }
  };

  ["chat.s1", "chat.s2", "chat.s3", "chat.s4"].forEach(key => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = t(key);
    b.addEventListener("click", () => ask(t(key)));
    document.getElementById("chatSuggest").appendChild(b);
  });

  document.getElementById("chatForm").addEventListener("submit", e => {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });

  const open = () => { chat.classList.add("open"); chat.setAttribute("aria-hidden", "false"); input.focus(); };
  document.querySelectorAll("[data-open-chat]").forEach(btn =>
    btn.addEventListener("click", () => (chat.classList.contains("open") ? chat.classList.remove("open") : open()))
  );
  chat.querySelector(".chat-close").addEventListener("click", () => chat.classList.remove("open"));

  add(t("chat.welcome"), "bot");
}

// ---------- Module cards (module pages not built yet) ----------
function bindModuleCards() {
  const user = getUser();
  document.querySelectorAll("[data-module]").forEach(card =>
    card.addEventListener("click", () => {
      // Application tools save personal progress, so they require login.
      if ("requiresLogin" in card.dataset && !user) {
        const back = location.pathname.split("/").pop() + "#tools";
        location.href = `login.html?next=${encodeURIComponent(back)}`;
        return;
      }
      const name = card.querySelector("h3").textContent;
      toast(`${name} ${t("module.dev")}`);
    })
  );
  // Hide the "please log in" notice once the user is logged in.
  document.querySelectorAll(".login-notice").forEach(n => (n.hidden = Boolean(user)));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

// ---------- FAQ accordion ----------
function bindAccordion() {
  document.querySelectorAll(".faq-q").forEach(q =>
    q.addEventListener("click", () => q.parentElement.classList.toggle("open"))
  );
}

if (renderLayout() !== false) {
  renderChat();
  bindModuleCards();
  bindAccordion();
  initI18n();
}
