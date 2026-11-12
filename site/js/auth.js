// Login & sign-up form handling.
// The forms are checked here first, then sent to the Node.js backend (POST /api/auth/login, /api/auth/signup,
// see server/auth.js), which checks or creates the account in MySQL and sets the login cookie.
// Text comes from js/i18n.js (t() function), which must be loaded before this file.

// Only allow redirects back to a page of this site (e.g. "application.html#tools").
function nextPage() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[\w-]+\.html(#[\w-]+)?$/.test(next) ? next : "index.html";
}

// Language switcher and translated text
document.querySelector(".auth-lang").innerHTML = langSwitchHtml();
initI18n();

// Sign in and sign up are on one card: "#signup" in the address shows the sign-up side.
const card = document.getElementById("authCard");
function setMode(mode) {
  card.classList.toggle("signup", mode === "signup");
  history.replaceState(null, "", location.search + (mode === "signup" ? "#signup" : ""));
}
document.querySelectorAll("[data-mode]").forEach(el =>
  el.addEventListener("click", e => { e.preventDefault(); setMode(el.dataset.mode); }));
if (location.hash === "#signup") {
  card.classList.add("no-anim"); // open on the sign-up side without sliding
  setMode("signup");
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("no-anim")));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(form, field, message) {
  const el = form.querySelector(`.error[data-for="${field}"]`);
  const input = form.querySelector(`[name="${field}"]`);
  if (el) el.textContent = message || "";
  if (input) input.classList.toggle("invalid", Boolean(message));
  return !message;
}

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

// Sends the form to the backend. Returns { ok, status, data }.
async function postAuth(url, body) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

// Logged in: keep the name for the header, then go back to the page the student came from
function loggedIn(user) {
  localStorage.setItem("uaa_user", JSON.stringify(user));
  toast(t("auth.toast.login"));
  setTimeout(() => (location.href = nextPage()), 800);
}

// Show / hide password
document.querySelectorAll(".pw-toggle").forEach(btn =>
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? t("auth.hide") : t("auth.show");
  })
);

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    const ok = [
      setError(loginForm, "email", !email ? t("auth.err.email") : !EMAIL_RE.test(email) ? t("auth.err.emailInvalid") : ""),
      setError(loginForm, "password", !password ? t("auth.err.password") : ""),
    ].every(Boolean);
    if (!ok) return;

    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    const { ok: success, data } = await postAuth("/api/auth/login", { email, password, remember: loginForm.remember.checked });
    button.disabled = false;
    if (success) return loggedIn(data.user);
    setError(loginForm, "password", data.error === "wrong_login" ? t("auth.err.wrongLogin") : t("auth.err.server"));
  });

  document.getElementById("forgotLink").addEventListener("click", e => {
    e.preventDefault();
    toast(t("auth.toast.forgot"));
  });
}

// Sign up
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    const f = signupForm;
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const password = f.password.value;
    const confirm = f.confirm.value;
    const ok = [
      setError(f, "name", !name ? t("auth.err.name") : ""),
      setError(f, "email", !email ? t("auth.err.email") : !EMAIL_RE.test(email) ? t("auth.err.emailInvalid") : ""),
      setError(f, "password", password.length < 8 ? t("auth.err.pwLength") : ""),
      setError(f, "confirm", confirm !== password || !confirm ? t("auth.err.pwMatch") : ""),
      setError(f, "agree", !f.agree.checked ? t("auth.err.agree") : ""),
    ].every(Boolean);
    if (!ok) return;

    // The new account is logged in straight away
    const button = f.querySelector("button[type=submit]");
    button.disabled = true;
    const { ok: success, data } = await postAuth("/api/auth/signup", { name, email, password });
    button.disabled = false;
    if (success) return loggedIn(data.user);
    if (data.error === "email_taken") setError(f, "email", t("auth.err.emailTaken"));
    else setError(f, "agree", t("auth.err.server"));
  });
}
