// Login & sign-up form handling (front-end validation only).
// TODO: send the form data to the Node.js backend (e.g. POST /api/login, POST /api/signup),
// which will check or create the user in MySQL and store passwords in hashed form.

// Only allow redirects back to a page of this site (e.g. "application.html#tools").
function nextPage() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[\w-]+\.html(#[\w-]+)?$/.test(next) ? next : "index.html";
}

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
    btn.textContent = show ? "Hide" : "Show";
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
      setError(loginForm, "email", !email ? "Please enter your email." : !EMAIL_RE.test(email) ? "Please enter a valid email." : ""),
      setError(loginForm, "password", !password ? "Please enter your password." : ""),
    ].every(Boolean);
    if (!ok) return;

    // Prototype only: remember the user in the browser until the Node.js backend is ready.
    localStorage.setItem("uaa_user", JSON.stringify({ email, name: email.split("@")[0] }));
    toast("Login successful. Redirecting…");
    setTimeout(() => (location.href = nextPage()), 1000);
  });

  document.getElementById("forgotLink").addEventListener("click", e => {
    e.preventDefault();
    toast("Password reset is under development.");
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
      setError(f, "name", !name ? "Please enter your full name." : ""),
      setError(f, "email", !email ? "Please enter your email." : !EMAIL_RE.test(email) ? "Please enter a valid email." : ""),
      setError(f, "password", password.length < 8 ? "Password must be at least 8 characters." : ""),
      setError(f, "confirm", confirm !== password || !confirm ? "Passwords do not match." : ""),
      setError(f, "agree", !f.agree.checked ? "Please tick this box to continue." : ""),
    ].every(Boolean);
    if (!ok) return;

    toast("Account created (prototype). Please log in.");
    setTimeout(() => (location.href = "login.html" + location.search), 1200);
  });
}
