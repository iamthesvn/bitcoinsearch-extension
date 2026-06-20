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

## Install from source

Works in Chrome, Edge, Brave, or any Chromium browser that supports Manifest V3.

1. Clone the repo:
   ```bash
   git clone https://github.com/iamthesvn/bitcoinsearch-extension.git
   ```
2. Open `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `bitcoinsearch-extension` folder.
6. That's it. No build step or `npm install` is needed just to run the extension.

## Development

If you want to change the code, format it, or build the release zip, you'll need Node.js for the dev tooling.

```bash
git clone https://github.com/iamthesvn/bitcoinsearch-extension.git
cd bitcoinsearch-extension
npm install
npm run format
npm run format:check
npm run lint
npm run pack
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
