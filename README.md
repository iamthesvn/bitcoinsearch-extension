# Bitcoin Search Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

This extension lets you search [bitcoinsearch.xyz](https://bitcoinsearch.xyz/) without opening a new tab first. Use the address bar, a keyboard shortcut, or the toolbar icon.

> This is not an official bitcoinsearch.xyz project. I built it because I wanted a faster way to search bitcoin's technical ecosystem from anywhere in the browser.

## How to use it

- Type `btc` in the address bar, press `Tab`, enter your query, and hit `Enter`.
- Press `Ctrl+Shift+K` (`Cmd+Shift+K` on a Mac) on any web page to open a floating overlay.
- Click the Bitcoin Search icon in the toolbar for a compact popup.
- On built-in browser pages like `chrome://newtab/`, the shortcut opens a centered popup window instead of the overlay. Chrome doesn't allow overlays on those pages.
- Toggle light or dark mode from the popup or popup window. Your preference is saved and applies to the overlay too.

## Install it locally

Works in Chrome, Edge, Brave, or any Chromium browser that supports Manifest V3.

1. Open `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `bitcoinsearch-extension` folder.
5. That's it.

## Development

Node.js is only used for formatting and linting. The extension itself has no build step — just HTML, CSS, and JavaScript.

```bash
npm install
npm run format
npm run format:check
npm run lint
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

- `activeTab` — accesses the current page when you press the shortcut so the overlay can be injected.
- `scripting` — injects the overlay content script on demand.
- `storage` — saves your dark-mode preference locally.
- `windows` — opens the popup-window fallback centered on your current window.
- `https://bitcoinsearch.xyz/*` — calls the public bitcoinsearch.xyz search API.
- `<all_urls>` — lets the overlay run on any web page. If you decline this, the shortcut will try dynamic injection using `activeTab` instead, and fall back to the popup window if that fails.

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

### The shortcut does nothing

1. Go to `chrome://extensions/shortcuts` and make sure **Bitcoin Search** has a shortcut assigned.
2. Reload the extension from `chrome://extensions/`.

### The overlay never appears, only the popup window

The overlay needs permission to run on the page. The first time you use the shortcut, Chrome may ask you to allow the extension on all sites — accept it.

If you already denied it, go to `chrome://extensions/`, open **Details** for **Bitcoin Search**, and set **Site access** to **On all sites**.

Built-in pages like `chrome://newtab/`, Settings, and Extensions can't run content scripts, so the shortcut will always open the popup window there.

## License

[MIT](LICENSE)
