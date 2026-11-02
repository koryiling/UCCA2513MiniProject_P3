// Login & sign-up form handling (front-end validation only).
// Text comes from js/i18n.js (t() function), which must be loaded before this file.
// TODO: send the form data to the Node.js backend (e.g. POST /api/login, POST /api/signup),
// which will check or create the user in MySQL and store passwords in hashed form.

// Only allow redirects back to a page of this site (e.g. "application.html#tools").
function nextPage() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[\w-]+\.html(#[\w-]+)?$/.test(next) ? next : "index.html";
}

// Language switcher and translated text
document.querySelector(".auth-lang").innerHTML = langSwitchHtml();
initI18n();

// Keep the "next" page when switching between the login and sign-up pages.
document.querySelectorAll('a[href="signup.html"], a[href="login.html"]').forEach(a => (a.href += location.search));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(form, field, message) {
  const el = form.querySelector(`.error[data-for="${field}"]`);
  const input = form.querySelector(`#${field}`);
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
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    const ok = [
      setError(loginForm, "email", !email ? t("auth.err.email") : !EMAIL_RE.test(email) ? t("auth.err.emailInvalid") : ""),
      setError(loginForm, "password", !password ? t("auth.err.password") : ""),
    ].every(Boolean);
    if (!ok) return;

    // Prototype only: remember the user in the browser until the Node.js backend is ready.
    localStorage.setItem("uaa_user", JSON.stringify({ email, name: email.split("@")[0] }));
    toast(t("auth.toast.login"));
    setTimeout(() => (location.href = nextPage()), 1000);
  });

  document.getElementById("forgotLink").addEventListener("click", e => {
    e.preventDefault();
    toast(t("auth.toast.forgot"));
  });
}

// Sign up
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", e => {
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

    toast(t("auth.toast.signup"));
    setTimeout(() => (location.href = "login.html" + location.search), 1200);
  });
}
