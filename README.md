# Bitcoin Search Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

A small, fast browser extension that puts [bitcoinsearch.xyz](https://bitcoinsearch.xyz/) right where you need it — the address bar, a floating overlay, or the toolbar icon.

> **Disclaimer:** This is an independent, unofficial extension built by someone who wanted a quicker way to search bitcoin's technical ecosystem. It is not affiliated with, endorsed by, or maintained by the bitcoinsearch.xyz team.

## What it does

- **Search from the address bar** — type `btc`, press `Tab`, enter your query, and go straight to the results.
- **Floating overlay anywhere** — hit `Ctrl+Shift+K` (`Cmd+Shift+K` on a Mac) on any page to search without leaving the tab.
- **Toolbar popup** — click the extension icon for a compact search view.
- **Falls back gracefully** — on built-in pages like `chrome://newtab/`, Settings, or Extensions, the shortcut opens a centered popup window instead.
- **Light or dark** — toggle themes from the popup or popup window. Your choice is saved and syncs to the overlay too.

## Install it locally

Works in any Chromium browser that supports Manifest V3 (Chrome, Edge, Brave, etc.).

1. Open `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `bitcoinsearch-extension` folder.
5. You're good to go.

## How to use it

- Type `btc <query>` in the address bar and press **Enter**.
- Or press `Ctrl+Shift+K` / `Cmd+Shift+K` on any web page.
- Or click the Bitcoin Search icon in your toolbar.

## Development

Node.js is only used for formatting and linting. The extension itself has no build step — just plain HTML, CSS, and JavaScript.

```bash
# Install dev tooling
npm install

# Format everything
npm run format

# Check formatting
npm run format:check

# Lint JavaScript
npm run lint

# Create a distributable zip
npm run pack
```

## Project structure

```
.
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker: API calls, omnibox, keyboard shortcut, popup fallback
├── shared.js              # Shared utilities, DOM helpers, and theme handling
├── shared.css             # Common styles for the popup and popup window
├── content.js             # Floating overlay injected into pages
├── content.css            # Minimal overlay host styles
├── popup.html/.css/.js    # Toolbar popup
├── window.html/.css/.js   # Centered fallback popup window
├── icons/                 # Extension icons
├── eslint.config.mjs      # ESLint flat config
├── .prettierrc.json       # Prettier config
└── package.json           # Dev tooling scripts
```

## Permissions

Here's exactly what each permission is for:

- `activeTab` — temporarily accesses the current page so the overlay can be injected when you press the shortcut.
- `scripting` — injects the overlay content script on demand.
- `storage` — saves your dark-mode preference locally.
- `windows` — opens the popup-window fallback centered on your current window.
- `https://bitcoinsearch.xyz/*` — calls the public bitcoinsearch.xyz search API.
- `<all_urls>` — lets the overlay run on any web page. If you decline this, the shortcut will still try dynamic injection using `activeTab`, and fall back to the popup window if that fails.

## Search API

The extension talks to the public bitcoinsearch.xyz endpoint:

```http
POST https://bitcoinsearch.xyz/api/elasticSearchProxy/search
Content-Type: application/json

{
  "queryString": "taproot",
  "size": 5,
  "page": 0
}
```

## Troubleshooting

### The shortcut does nothing

1. Visit `chrome://extensions/shortcuts` and make sure **Bitcoin Search** has a shortcut assigned.
2. Try reloading the extension from `chrome://extensions/`.

### The overlay never appears, only the popup window

The overlay needs permission to run on the page you're visiting. The first time you use the shortcut, Chrome may ask you to allow the extension on all sites — accepting it will let the overlay appear everywhere.

If you already denied it, go to `chrome://extensions/`, open **Details** for **Bitcoin Search**, and set **Site access** to **On all sites**.

Built-in browser pages like `chrome://newtab/`, Settings, and Extensions can't run content scripts at all, so the shortcut will always open the popup window there. That's a Chrome security limitation, not a bug.

## License

[MIT](LICENSE) — use it, tweak it, share it.
