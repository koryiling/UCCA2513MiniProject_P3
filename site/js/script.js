// Shared layout and chatbot for every page.
// Each page sets <body data-page="home|admission|application|fees|scholarship|student-life|faq"> to highlight its menu item.

const LINKS = {
  requirements: "https://admission.utar.edu.my/Entry-Qualifications-and-English-Language-Requirements.php",
  apply: "https://admission.utar.edu.my/Apply_Now.php",
  faq: "https://admission.utar.edu.my/FAQs.php",
};

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
    ["home", "index.html", "Home"],
    ["admission", "admission.html", "Admission"],
    ["application", "application.html", "Application"],
    ["fees", "fees.html", "Tuition Fees"],
    ["scholarship", "scholarship.html", "Scholarship Information"],
    ["student-life", "student-life.html", "Student Life", [
      ["student-life.html#campus", "Campus"],
      ["student-life.html#faculty", "Faculty"],
      ["student-life.html#facilities", "Facilities"],
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
          ? `<span class="user-menu"><span class="user-name">Hi, ${escapeHtml(user.name)}</span><button class="btn btn-outline" id="logoutBtn">Logout</button></span>`
          : ""}
      </div>
    </header>`;

  document.getElementById("site-footer").outerHTML = `
    <footer class="site-footer">
      <div class="container footer-center">
        <p class="footer-copy">© ${new Date().getFullYear()} UNIVERSITI TUNKU ABDUL RAHMAN <em>DU012(A).</em></p>
        <p class="footer-owner">Wholly owned by UTAR Education Foundation <em>(200201010564(578227-M))</em>
          <span class="footer-legal">
            <span>LEGAL STATEMENT</span>
            <span>TERM OF USAGE</span>
            <span>PRIVACY NOTICE</span>
          </span>
        </p>
        <nav class="footer-quick">
          ${[...nav.map(([, href, label]) => [href, label]), ["faq.html", "FAQ"]]
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

// ---------- Rule-based chatbot (pop-up window) ----------
const RULES = [
  {
    keys: ["fee", "tuition", "cost", "price"],
    answer: `Tuition fees depend on the programme. See the <a href="fees.html">Tuition Fees page</a> and always confirm the latest fees with UTAR.`,
  },
  {
    keys: ["scholarship", "financial aid", "loan", "ptptn"],
    answer: `Please see the <a href="scholarship.html">Scholarship Information page</a> for available options and links to official UTAR information.`,
  },
  {
    keys: ["campus", "hostel", "accommodation", "club", "student life", "facilit", "faculty", "faculties"],
    answer: `See the <a href="student-life.html">Student Life page</a> for an overview of UTAR's <a href="student-life.html#campus">campuses</a>, <a href="student-life.html#faculty">faculties</a> and <a href="student-life.html#facilities">facilities</a>.`,
  },
  {
    keys: ["requirement", "entry", "qualif", "spm", "stpm", "uec", "english", "muet", "ielts"],
    answer: `Entry requirements depend on the programme and your qualification (e.g. SPM, STPM or UEC), and include English-language requirements. See the <a href="admission.html">Admission page</a> or the official list: <a href="${LINKS.requirements}" target="_blank" rel="noopener">UTAR entry qualifications</a>.`,
  },
  {
    keys: ["apply", "application", "procedure", "step", "how do i"],
    answer: `Applications are made online through UTAR. See the steps on the <a href="application.html">Application page</a> and the official guide: <a href="${LINKS.apply}" target="_blank" rel="noopener">UTAR Apply Now</a>.`,
  },
  {
    keys: ["document", "certificate", "ic", "passport", "checklist"],
    answer: `The documents you need depend on your qualification. The <b>Personalized Document Checklist</b> on the <a href="application.html">Application page</a> will generate a list for your situation.`,
  },
  {
    keys: ["date", "deadline", "intake", "when", "close"],
    answer: `Important dates are listed on the <a href="application.html#dates">Application page</a>. Always check the latest intake dates with UTAR.`,
  },
  {
    keys: ["not eligible", "don't meet", "dont meet", "fail", "alternative", "pathway", "foundation", "diploma"],
    answer: `If you do not meet a requirement yet, the <b>Alternative Pathway Recommendation</b> on the <a href="admission.html">Admission page</a> can suggest other routes, such as related foundation or diploma programmes.`,
  },
  {
    keys: ["hi", "hello", "hey"],
    answer: `Hello! You can ask me about admission requirements, the application procedure, documents or deadlines.`,
  },
];
const FALLBACK = `Sorry, I don't have an answer for that yet. Please check the <a href="${LINKS.faq}" target="_blank" rel="noopener">UTAR admission FAQs</a> or contact UTAR's Division of Admissions and Credit Evaluation (DACE).`;
const SUGGESTIONS = ["What are the entry requirements?", "How do I apply to UTAR?", "What documents do I need?", "When is the next deadline?"];

function renderChat() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="chat-popup" id="chat" aria-hidden="true">
      <div class="chat-head">
        <span class="bot-avatar">🤖</span>
        <strong>UTAR Admission Assistant</strong>
        <span class="status"><i></i>Online</span>
        <button class="chat-close" aria-label="Close chat">✕</button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-suggest" id="chatSuggest"><p>Suggested Questions:</p></div>
      <form class="chat-input" id="chatForm" autocomplete="off">
        <input id="chatInput" type="text" placeholder="Type your question here..." aria-label="Your question">
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
  const reply = q => {
    q = q.toLowerCase();
    const rule = RULES.find(r => r.keys.some(k => (k.length <= 3 ? new RegExp(`\\b${k}\\b`).test(q) : q.includes(k))));
    return rule ? rule.answer : FALLBACK;
  };
  const ask = q => {
    if (!q.trim()) return;
    add(q, "user");
    setTimeout(() => add(reply(q), "bot"), 400);
  };

  SUGGESTIONS.forEach(s => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = s;
    b.addEventListener("click", () => ask(s));
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

  add("Hello! Welcome to UTAR Admission Assistant. How can I help you today?", "bot");
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
      toast(`${card.dataset.module} page is under development.`);
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
}
