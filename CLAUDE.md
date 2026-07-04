# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A collection of offline, client-side developer tools. Each tool is a single self-contained `.html` file — no build step, no bundler, no npm, no dependencies. Open any file in a browser and it works. Deployed as static files to GitHub Pages (https://wahyuakbarwibowo.github.io/diff/).

There is nothing to build, install, or compile. "Run" = open the HTML file in a browser (`open index.html`). "Test" = manually exercise the page.

## Architecture

- **One file per tool.** All HTML, CSS, and JS for a tool lives in its own page (`url.html`, `json.html`, etc.). Logic goes in an inline `<script>` at the bottom; there are no shared JS modules beyond `common.js`.
- **`assets/common.js`** — shared runtime loaded right after `<body>` opens. It injects the sidebar nav, manages the light/dark theme (localStorage key `difftool-theme`, cycles auto → light → dark), and exposes globals every page relies on: `$(id)`, `esc()` (HTML-escape — use it on any user input rendered as HTML), `toast(msg)`, `copyText(text, okMsg)`, `setStatus(el, msg, cls)`.
- **`assets/common.css`** — shared styling. Reusable classes: `.card`, `.controls`, `.panes`/`.pane`/`.pane-header`, `.options`, `.status`, `.hint`, `.sidebar`.
- **`index.html` is the exception** — it's fully self-contained (does not depend on `assets/`) because its "export as HTML" feature embeds its own styles into the downloaded file. Keep it that way.

## Adding a tool

1. Create `newtool.html` following the structure of an existing page (e.g. `url.html`): same `<head>` meta/OG block, `<link rel="stylesheet" href="assets/common.css">`, `<script src="assets/common.js"></script>` right after `<body>`, a `#theme` button, a `#toast` div.
2. Register it in **two** places: the `TOOLS` array in `assets/common.js` (drives the injected sidebar) **and** the static sidebar markup in `index.html` (which doesn't use `common.js`).

## Conventions

- Everything runs in the browser; nothing leaves it. No network calls, no external CDNs, no analytics.
- Escape all user-controlled input with `esc()` before inserting into `innerHTML` (this codebase has had XSS-hardening passes — keep it hardened).
- Match the surrounding page's style: inline scripts, `"use strict"`, small pure helper functions, `localStorage` for persistence.
- **When anything under `assets/` changes, bump the `CACHE` version in `sw.js`** — the service worker serves assets cache-first, so returning visitors never see asset changes otherwise.

## Commit workflow

The user commits as a separate approval step — do not auto-commit unless asked.
