# ⚡ DiffTool

Single-file web app to compare text, JSON, YAML, XML, or CSV. No build step, no dependencies — open `index.html` in a browser and it works.

## Usage

```bash
open index.html        # macOS
# or just double-click the file
```

1. Paste the original content on the left, the changed content on the right.
2. Click **Compare** (or press <kbd>Ctrl/Cmd</kbd> + <kbd>Enter</kbd>).
3. Click **Sample** to see a quick demo.

## Features

- **Formats** — auto-detect, plain text, JSON, YAML, XML, CSV. Each format is normalized before diffing (JSON/YAML parsed and pretty-printed, XML formatted, CSV re-serialized with consistent quoting); parse errors are shown inline. JSON with trailing commas is fixed automatically.
- **Structural view (JSON/YAML)** — compares parsed objects key-by-key and lists added/removed/changed paths like `$.dependencies.react: "^18.2.0" → "^18.3.1"`, immune to formatting and ordering.
- **Split & unified views** — side-by-side with aligned rows, or a single unified column.
- **Line + word diff** — line-level LCS diff with common prefix/suffix trimming, plus word-level highlights on changed line pairs.
- **Collapse unchanged regions** — long unchanged runs fold into `⋯ N unchanged lines ⋯`, click to expand.
- **Ignore options** — sort keys (JSON/YAML), ignore whitespace, ignore case.
- **Files** — drag & drop a file onto either pane, or use the 📂 button.
- **Share links** — 🔗 encodes both inputs (deflate + base64url) into the URL hash; send the link to share a diff.
- **Copy patch / export** — copy the diff as unified patch text, or download the rendered diff as a standalone HTML file.
- **Light/dark theme** — follows the system by default, toggle cycles auto → light → dark.
- **Persistence** — the last comparison is restored from `localStorage` on reload (a share link in the URL takes precedence).
- **Stats & utilities** — added/removed/unchanged counts, swap left/right, clear, sample data, <kbd>Ctrl/Cmd</kbd>+<kbd>Enter</kbd>.

## How it works

Everything lives in `index.html`:

- Inputs are normalized per format (parse → optionally sort keys → stringify), then split into lines. Ignore-whitespace/case apply to the comparison keys only, so the display keeps the original text.
- A longest-common-subsequence diff aligns the two line arrays. Common prefix/suffix is trimmed first to keep the DP table small; pathologically large inputs fall back to a naive replace block instead of hanging.
- Contiguous delete/add runs are paired up so changed lines render side by side, and the same LCS engine runs again over word tokens within each pair to mark what changed.
- The structural view skips lines entirely: it walks both parsed values recursively and reports differing paths.
- YAML support is a small built-in subset parser (nested maps, lists, scalars, comments — no anchors or multi-line strings); XML uses the browser's `DOMParser`.

## Notes & limitations

- Array elements in structural view are compared by index, so an insertion in the middle of an array reports every later index as changed.
- The YAML parser covers the common subset only; files it can't parse fall back to plain-text diffing with an error note.
- Share links carry the full inputs in the URL — very large inputs make very long URLs.

## Roadmap / ideas

- [ ] **Syntax highlighting** in the diff panes.
- [ ] **Three-way merge view** (base + two changes).
- [ ] **Smarter array matching** in structural view (LCS over array items instead of index-by-index).
- [ ] **PWA/offline install** — manifest + service worker.

## License

MIT
