# Bitcoin Search Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

A production-ready browser extension that brings the [bitcoinsearch.xyz](https://bitcoinsearch.xyz/) search omnibox to every page of your browser.

## Features

- **Address-bar search** — type `btc` followed by `Tab` in the Chrome/Edge/Brave address bar, enter your query, and jump straight to results.
- **Floating overlay** — press `Ctrl+Shift+K` (`Cmd+Shift+K` on macOS) on any web page to open a Bitcoin Search overlay.
- **Toolbar popup** — click the extension icon for a compact search popup.
- **Popup fallback** — on pages where the overlay can't be injected (e.g. `chrome://newtab/`, Settings, Extensions), the shortcut opens the search UI in a centered popup window instead.

## Installation

### Chrome / Edge / Brave (Manifest V3)

1. Open `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked**.
4. Select the `bitcoinsearch-extension` folder.
5. The extension is now installed.

### Usage

- Type `btc <query>` in the address bar and press **Enter**.
- Or press `Ctrl+Shift+K` / `Cmd+Shift+K` on any web page.
- Or click the Bitcoin Search toolbar icon.

## Development

This project uses [Node.js](https://nodejs.org/) only for development tooling. The extension itself has no build step.

```bash
# Install dependencies
npm install

# Format code
npm run format

# Check formatting
npm run format:check

# Lint JavaScript
npm run lint

# Package the extension for distribution
npm run pack
```

## Project structure

```
.
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker: API calls, omnibox, keyboard shortcut, popup fallback
├── shared.js              # Shared utilities and safe DOM helpers
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

- `activeTab` — to inject the floating overlay into the current page when you press the shortcut.
- `scripting` — to inject the overlay content script on demand.
- `windows` — to open the popup-window fallback centered on your current window.
- `https://bitcoinsearch.xyz/*` — to call the public bitcoinsearch.xyz search API.
- `<all_urls>` (host permission) — so the manifest-declared content script can run on any web page. If you decline this, the shortcut will still try to work via dynamic injection using `activeTab`, and will fall back to the popup window if that fails.

## Search API

The extension calls the public bitcoinsearch.xyz endpoint:

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

### Shortcut does nothing

1. Go to `chrome://extensions/shortcuts` and make sure **Bitcoin Search** has a shortcut assigned.
2. Reload the extension from `chrome://extensions/`.

### Overlay never appears, only the popup window

The overlay needs permission to run on the active page. The first time you press the shortcut, Chrome may prompt you to allow the extension on all sites — accept it.

If you already denied the permission, go to `chrome://extensions/`, click **Details** on **Bitcoin Search**, and set **Site access** to **On all sites**.

Built-in browser pages such as `chrome://newtab/`, Settings, and Extensions cannot run content scripts, so the shortcut will always open the popup window there. This is a Chrome security limitation.

## License

[MIT](LICENSE)
