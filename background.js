const API_URL = 'https://bitcoinsearch.xyz/api/elasticSearchProxy/search';
const SEARCH_PAGE_URL = 'https://bitcoinsearch.xyz/';
const SEARCH_PARAM = 'search';

/**
 * Call the bitcoinsearch.xyz search API.
 * @param {string} query
 * @param {number} [size]
 * @returns {Promise<Array>}
 */
async function searchBitcoin(query, size = 5) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryString: query, size, page: 0 })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const json = await response.json();
  const hits = json?.data?.result?.hits?.hits;

  if (!Array.isArray(hits)) {
    throw new Error('Unexpected API response format');
  }

  return hits;
}

/**
 * Escape characters allowed in Chrome omnibox rich suggestions.
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return String(str).replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]
  );
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildSearchUrl(query) {
  const url = new URL(SEARCH_PAGE_URL);
  url.searchParams.set(SEARCH_PARAM, query);
  return url.toString();
}

// Omnibox: address-bar search via "btc <query>"
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text.trim()) {
    return;
  }

  try {
    const hits = await searchBitcoin(text, 5);
    const suggestions = hits.map((hit) => {
      const source = hit._source || {};
      const title = escapeXml(source.title || 'Untitled');
      const host = escapeXml(source.domain || getHostname(source.url));
      return {
        content: source.url,
        description: `<match>${title}</match> — <url>${host}</url>`
      };
    });
    suggest(suggestions);
  } catch {
    // Fail silently in the omnibox; the user can still press Enter to search.
  }
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const destination = text.startsWith('http') ? text : buildSearchUrl(text);

  switch (disposition) {
    case 'newForegroundTab':
      chrome.tabs.create({ url: destination });
      break;
    case 'newBackgroundTab':
      chrome.tabs.create({ url: destination, active: false });
      break;
    default:
      chrome.tabs.update({ url: destination });
  }
});

// Handle search requests from content scripts / popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'search') {
    return;
  }

  const query = String(request.query || '').trim();
  const size = Math.max(1, Math.min(Number(request.size) || 6, 25));

  searchBitcoin(query, size)
    .then((hits) => sendResponse({ hits, ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function hasAllUrlsPermission() {
  return chrome.permissions.contains({ origins: ['<all_urls>'] });
}

async function requestAllUrlsPermission() {
  try {
    return await chrome.permissions.request({ origins: ['<all_urls>'] });
  } catch {
    return false;
  }
}

async function pingContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response?.ok === true;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['shared.js', 'content.js'],
      world: 'ISOLATED'
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css']
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function ensureContentScriptInjected(tab) {
  if (!tab?.id) {
    return { ok: false, error: 'no tab id' };
  }

  if (await pingContentScript(tab.id)) {
    return { ok: true };
  }

  const injection = await injectContentScript(tab.id);
  if (!injection.ok) {
    return { ok: false, error: injection.error };
  }

  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await pingContentScript(tab.id)) {
      return { ok: true };
    }
  }

  return { ok: false, error: 'content script did not respond after injection' };
}

async function openPopupWindow() {
  try {
    const currentWindow = await chrome.windows.getLastFocused();
    const width = 420;
    const height = 540;
    const left = Math.round(
      (currentWindow.left || 0) + (currentWindow.width || 1200) / 2 - width / 2
    );
    const top = Math.round(
      (currentWindow.top || 0) + (currentWindow.height || 800) / 2 - height / 2
    );

    await chrome.windows.create({
      url: chrome.runtime.getURL('window.html'),
      type: 'popup',
      width,
      height,
      left: Math.max(0, left),
      top: Math.max(0, top)
    });
  } catch {
    chrome.tabs.create({ url: SEARCH_PAGE_URL });
  }
}

async function getActiveTab() {
  let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs?.[0]?.id) {
    return tabs[0];
  }

  tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs?.[0]?.id) {
    return tabs[0];
  }

  tabs = await chrome.tabs.query({ active: true });
  return tabs?.[0];
}

function isInjectableUrl(url) {
  return (
    url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://'))
  );
}

// Keyboard shortcut toggles the overlay in the active tab
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-bitcoin-search') {
    return;
  }

  const tab = await getActiveTab();
  if (!tab?.id || !isInjectableUrl(tab.url)) {
    await openPopupWindow();
    return;
  }

  let ready = await ensureContentScriptInjected(tab);

  if (!ready.ok && !(await hasAllUrlsPermission())) {
    const granted = await requestAllUrlsPermission();
    if (granted) {
      ready = await ensureContentScriptInjected(tab);
    }
  }

  if (!ready.ok) {
    await openPopupWindow();
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  } catch {
    await openPopupWindow();
  }
});
