// Shared runtime for all DevTools pages: sidebar injection, theme, toast, helpers.
// Load this right after <body> opens so the sidebar exists before page content paints.
"use strict";

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
  { href: "html.html", label: "🌐 HTML preview" },
  { href: "handlebars.html", label: "{{ }} Handlebars" },
  { href: "types.html", label: "🏷️ JSON → Types" },
  { href: "number.html", label: "🔢 Number base" },
  { href: "escape.html", label: "\\ Escape" },
  { href: "hijri.html", label: "🌙 Hijri Calendar" },
  { href: "games.html", label: "🎮 Games" },
];

(function injectSidebar() {
  const page = location.pathname.split("/").pop() || "index.html";
  const aside = document.createElement("aside");
  aside.className = "sidebar";
  aside.innerHTML =
    `<div class="brand">⚡ Dev<span>Tools</span></div>` +
    `<button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button><nav>` +
    TOOLS.map(t => `<a href="${t.href}"${t.href === page ? ' class="active"' : ""}>${esc(t.label)}</a>`).join("") +
    `</nav>` +
    `<a class="gh" href="https://github.com/wahyuakbarwibowo/diff" target="_blank" rel="noopener" title="Source code on GitHub">` +
    `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>` +
    `GitHub</a>`;
  const toggle = aside.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", aside.classList.toggle("open"));
  });
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

// ---------- Command palette (Cmd/Ctrl+K) ----------
// Reads the sidebar links, so it works with both the injected and static nav.
function initPalette() {
  const links = [...document.querySelectorAll(".sidebar nav a")]
    .map(a => ({ href: a.getAttribute("href"), label: a.textContent.trim() }));
  if (!links.length) return;

  const overlay = document.createElement("div");
  overlay.id = "cmdk";
  overlay.innerHTML = `<div class="cmdk-box"><input id="cmdk-input" placeholder="Search tools…" autocomplete="off" spellcheck="false"><ul id="cmdk-list"></ul></div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#cmdk-input");
  const list = overlay.querySelector("#cmdk-list");
  let matches = [], sel = 0;

  function render() {
    const q = input.value.trim().toLowerCase();
    matches = q ? links.filter(l => l.label.toLowerCase().includes(q)) : links;
    if (sel >= matches.length) sel = 0;
    list.innerHTML = matches.map((l, i) =>
      `<li data-i="${i}"${i === sel ? ' class="sel"' : ""}>${esc(l.label)}</li>`).join("");
  }
  function open() {
    overlay.classList.add("show");
    input.value = ""; sel = 0; render();
    input.focus();
  }
  function close() { overlay.classList.remove("show"); }
  function go() { if (matches[sel]) location.href = matches[sel].href; }

  input.addEventListener("input", render);
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) { sel = +li.dataset.i; go(); }
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = (sel + 1) % matches.length; render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + matches.length) % matches.length; render(); e.preventDefault(); }
    else if (e.key === "Enter") { go(); }
    else if (e.key === "Escape") { close(); }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.classList.contains("show") ? close() : open();
    }
  });
}
initPalette();

// ---------- PWA: manifest link + service worker (offline install) ----------
(function initPWA() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "manifest.webmanifest";
    document.head.appendChild(link);
  }
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
