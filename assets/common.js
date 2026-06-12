// Shared runtime for all DevTools pages: sidebar injection, theme, toast, helpers.
// Load this right after <body> opens so the sidebar exists before page content paints.
"use strict";

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const TOOLS = [
  { href: "index.html", label: "⇄ Diff" },
  { href: "url.html", label: "🔗 URL" },
  { href: "base64.html", label: "📦 Base64" },
  { href: "jwt.html", label: "🎫 JWT" },
  { href: "timestamp.html", label: "🕐 Timestamp" },
  { href: "json.html", label: "{} JSON" },
  { href: "hash.html", label: "# Hash" },
  { href: "uuid.html", label: "🆔 UUID / ULID" },
  { href: "regex.html", label: ".* Regex" },
  { href: "cron.html", label: "⏰ Cron" },
  { href: "color.html", label: "🎨 Color" },
  { href: "fake.html", label: "🎲 Fake data" },
  { href: "case.html", label: "Aa Text case" },
  { href: "qr.html", label: "▦ QR code" },
];

(function injectSidebar() {
  const page = location.pathname.split("/").pop() || "index.html";
  const aside = document.createElement("aside");
  aside.className = "sidebar";
  aside.innerHTML =
    `<div class="brand">⚡ Dev<span>Tools</span></div><nav>` +
    TOOLS.map(t => `<a href="${t.href}"${t.href === page ? ' class="active"' : ""}>${esc(t.label)}</a>`).join("") +
    `</nav>`;
  document.body.prepend(aside);
})();

// ---------- Theme (shared localStorage key with the diff page) ----------

let themePref = localStorage.getItem("difftool-theme") || "auto";

function applyTheme() {
  const dark = themePref === "dark" || (themePref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const btn = $("theme");
  if (btn) {
    btn.textContent = themePref === "auto" ? "🌓" : themePref === "light" ? "☀️" : "🌙";
    btn.title = "Theme: " + themePref;
  }
}
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  const btn = $("theme");
  if (btn) btn.addEventListener("click", () => {
    themePref = themePref === "auto" ? "light" : themePref === "light" ? "dark" : "auto";
    localStorage.setItem("difftool-theme", themePref);
    applyTheme();
  });
});

// ---------- Toast & clipboard ----------

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

async function copyText(text, okMsg) {
  if (!text) { toast("Nothing to copy"); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg || "Copied to clipboard");
  } catch (e) {
    toast("Clipboard blocked by browser");
  }
}

function setStatus(el, msg, cls) {
  el.textContent = msg;
  el.className = "status" + (cls ? " " + cls : "");
}
