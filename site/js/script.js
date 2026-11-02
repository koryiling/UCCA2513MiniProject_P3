// Shared layout and chatbot for every page.
// Each page sets <body data-page="home|admission|application|fees|scholarship|student-life|faq"> to highlight its menu item.
// Text comes from js/i18n.js (t() function), which must be loaded before this file.

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

// ---------- Rule-based chatbot (pop-up window) ----------
// Each rule has keywords in English, Chinese and Malay, and an answer in each language.
// The chatbot answers in the language currently selected on the website.
const RULES = [
  {
    keys: ["fee", "fees", "tuition", "cost", "price", "学费", "费用", "yuran", "kos"],
    answer: {
      en: `Tuition fees depend on the programme. See the <a href="fees.html">Tuition Fees page</a> and always confirm the latest fees with UTAR.`,
      zh: `学费要看课程而定。请查看 <a href="fees.html">学费页面</a>，并以 UTAR 最新公布的费用为准。`,
      ms: `Yuran pengajian bergantung pada program. Lihat <a href="fees.html">halaman Yuran Pengajian</a> dan sentiasa sahkan yuran terkini dengan UTAR.`,
    },
  },
  {
    keys: ["scholarship", "financial aid", "loan", "ptptn", "奖学金", "贷款", "助学金", "biasiswa", "pinjaman"],
    answer: {
      en: `Please see the <a href="scholarship.html">Scholarship Information page</a> for available options and links to official UTAR information.`,
      zh: `请查看 <a href="scholarship.html">奖学金资讯页面</a>，了解可申请的选项和 UTAR 官方资讯链接。`,
      ms: `Sila lihat <a href="scholarship.html">halaman Maklumat Biasiswa</a> untuk pilihan yang ada dan pautan ke maklumat rasmi UTAR.`,
    },
  },
  {
    keys: ["campus", "hostel", "accommodation", "club", "student life", "facilit", "faculty", "faculties",
      "校区", "校园", "宿舍", "学院", "设施", "学生生活", "kampus", "asrama", "fakulti", "kemudahan", "kelab"],
    answer: {
      en: `See the <a href="student-life.html">Student Life page</a> for an overview of UTAR's <a href="student-life.html#campus">campuses</a>, <a href="student-life.html#faculty">faculties</a> and <a href="student-life.html#facilities">facilities</a>.`,
      zh: `请查看 <a href="student-life.html">学生生活页面</a>，了解 UTAR 的<a href="student-life.html#campus">校区</a>、<a href="student-life.html#faculty">学院</a>和<a href="student-life.html#facilities">设施</a>。`,
      ms: `Lihat <a href="student-life.html">halaman Kehidupan Pelajar</a> untuk gambaran <a href="student-life.html#campus">kampus</a>, <a href="student-life.html#faculty">fakulti</a> dan <a href="student-life.html#facilities">kemudahan</a> UTAR.`,
    },
  },
  {
    keys: ["requirement", "entry", "qualif", "spm", "stpm", "uec", "english", "muet", "ielts",
      "要求", "资格", "成绩", "英文", "syarat", "kelayakan", "bahasa inggeris"],
    answer: {
      en: `Entry requirements depend on the programme and your qualification (e.g. SPM, STPM or UEC), and include English-language requirements. See the <a href="admission.html">Admission page</a> or the official list: <a href="${LINKS.requirements}" target="_blank" rel="noopener">UTAR entry qualifications</a>.`,
      zh: `入学要求要看课程和你的学历（例如 SPM、STPM 或 UEC），也包括英文要求。请查看 <a href="admission.html">入学页面</a> 或官方列表：<a href="${LINKS.requirements}" target="_blank" rel="noopener">UTAR 入学资格</a>。`,
      ms: `Syarat kemasukan bergantung pada program dan kelayakan anda (contohnya SPM, STPM atau UEC), termasuk syarat Bahasa Inggeris. Lihat <a href="admission.html">halaman Kemasukan</a> atau senarai rasmi: <a href="${LINKS.requirements}" target="_blank" rel="noopener">Kelayakan masuk UTAR</a>.`,
    },
  },
  {
    keys: ["apply", "application", "procedure", "step", "how do i", "申请", "报名", "步骤", "mohon", "permohonan", "langkah"],
    answer: {
      en: `Register an account and complete UTAR's online application form. The outcome is usually released within 7 working days by email and SMS / WhatsApp. See the steps on the <a href="application.html">Application page</a> and the official guide: <a href="${LINKS.apply}" target="_blank" rel="noopener">UTAR Apply Now</a>.`,
      zh: `先注册账号，再填写 UTAR 的网上申请表格。结果一般会在 7 个工作天内通过电邮和 SMS / WhatsApp 通知。步骤请看 <a href="application.html">申请页面</a>，官方指南：<a href="${LINKS.apply}" target="_blank" rel="noopener">UTAR Apply Now</a>。`,
      ms: `Daftar akaun dan lengkapkan borang permohonan dalam talian UTAR. Keputusan biasanya dikeluarkan dalam masa 7 hari bekerja melalui e-mel dan SMS / WhatsApp. Lihat langkah di <a href="application.html">halaman Permohonan</a> dan panduan rasmi: <a href="${LINKS.apply}" target="_blank" rel="noopener">UTAR Apply Now</a>.`,
    },
  },
  {
    keys: ["document", "certificate", "ic", "passport", "checklist", "文件", "证件", "材料", "护照", "dokumen", "sijil", "pasport"],
    answer: {
      en: `The documents you need depend on your qualification. The <b>Personalized Document Checklist</b> on the <a href="application.html">Application page</a> will generate a list for your situation.`,
      zh: `需要的文件要看你的学历。<a href="application.html">申请页面</a> 上的<b>个人化文件清单</b>会根据你的情况列出需要准备的文件。`,
      ms: `Dokumen yang diperlukan bergantung pada kelayakan anda. <b>Senarai Semak Dokumen Peribadi</b> di <a href="application.html">halaman Permohonan</a> akan menyediakan senarai mengikut situasi anda.`,
    },
  },
  {
    keys: ["date", "deadline", "intake", "when", "close", "日期", "截止", "开课", "什么时候", "几时", "tarikh", "pengambilan", "bila"],
    answer: {
      en: `The next Foundation and Bachelor's Degree intakes start on 25 January 2027 and 9 June 2027 (MBBS and Nursing differ). See the <a href="application.html#dates">Application page</a> and always confirm with UTAR.`,
      zh: `基础课程和学士课程的下两次开课日期是 2027 年 1 月 25 日和 2027 年 6 月 9 日（MBBS 和护理课程不同）。请查看 <a href="application.html#dates">申请页面</a>，并以 UTAR 官方公布为准。`,
      ms: `Pengambilan Asasi dan Ijazah Sarjana Muda seterusnya bermula pada 25 Januari 2027 dan 9 Jun 2027 (MBBS dan Kejururawatan berbeza). Lihat <a href="application.html#dates">halaman Permohonan</a> dan sentiasa sahkan dengan UTAR.`,
    },
  },
  {
    keys: ["not eligible", "don't meet", "dont meet", "fail", "alternative", "pathway", "foundation", "diploma",
      "不符合", "不够", "达不到", "其他途径", "预科", "文凭", "tidak layak", "laluan", "asasi"],
    answer: {
      en: `If you do not meet a requirement yet, the <b>Alternative Pathway Recommendation</b> on the <a href="admission.html">Admission page</a> can suggest other routes, such as related foundation or diploma programmes.`,
      zh: `如果你暂时不符合某项要求，<a href="admission.html">入学页面</a> 上的<b>其他升学途径推荐</b>可以建议其他途径，例如相关的基础课程或文凭课程。`,
      ms: `Jika anda belum memenuhi sesuatu syarat, <b>Cadangan Laluan Alternatif</b> di <a href="admission.html">halaman Kemasukan</a> boleh mencadangkan laluan lain, seperti program asasi atau diploma yang berkaitan.`,
    },
  },
  {
    keys: ["hi", "hello", "hey", "你好", "哈喽", "hai", "helo"],
    answer: {
      en: `Hello! You can ask me about admission requirements, the application procedure, documents or deadlines.`,
      zh: `你好！你可以问我入学要求、申请程序、所需文件或截止日期等问题。`,
      ms: `Hai! Anda boleh bertanya kepada saya tentang syarat kemasukan, prosedur permohonan, dokumen atau tarikh tutup.`,
    },
  },
];
const FALLBACK = {
  en: `Sorry, I don't have an answer for that yet. Please check the <a href="${LINKS.faq}" target="_blank" rel="noopener">UTAR admission FAQs</a> or contact UTAR's Division of Admissions and Credit Evaluation (DACE).`,
  zh: `抱歉，我暂时没有这个问题的答案。请查看 <a href="${LINKS.faq}" target="_blank" rel="noopener">UTAR 招生常见问题</a>，或联系 UTAR 招生与学分评估部（DACE）。`,
  ms: `Maaf, saya belum mempunyai jawapan untuk soalan itu. Sila semak <a href="${LINKS.faq}" target="_blank" rel="noopener">Soalan Lazim kemasukan UTAR</a> atau hubungi Bahagian Kemasukan dan Penilaian Kredit (DACE) UTAR.`,
};

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
  // Short English keys (e.g. "ic", "hi") must match a whole word; everything else matches anywhere.
  const matches = (q, k) => (k.length <= 3 && /^[a-z]+$/.test(k) ? new RegExp(`\\b${k}\\b`).test(q) : q.includes(k));
  const reply = q => {
    q = q.toLowerCase();
    const rule = RULES.find(r => r.keys.some(k => matches(q, k)));
    return (rule ? rule.answer : FALLBACK)[lang];
  };
  const ask = q => {
    if (!q.trim()) return;
    add(q, "user");
    setTimeout(() => add(reply(q), "bot"), 400);
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
