(function (global) {
  'use strict';

  const THEME_STORAGE_KEY = 'bitcoinsearch-theme';
  const DARK_CLASS = 'bs-dark';

  const CONFIG = {
    API_URL: 'https://bitcoinsearch.xyz/api/elasticSearchProxy/search',
    SEARCH_PAGE_ORIGIN: 'https://bitcoinsearch.xyz',
    SEARCH_PARAM: 'search',
    DEFAULT_RESULT_SIZE: 6,
    DEBOUNCE_MS: 200,
    SNIPPET_MAX_LENGTH: 160
  };

  /**
   * Strip HTML tags and decode entities to plain text.
   * @param {string} html
   * @returns {string}
   */
  function stripHtml(html) {
    if (!html) {
      return '';
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), 'text/html');
    return doc.body?.textContent || '';
  }

  /**
   * Return true for http:// or https:// URLs.
   * @param {string} url
   * @returns {boolean}
   */
  function isHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  /**
   * Truncate a string to a maximum length with an ellipsis.
   * @param {string} str
   * @param {number} maxLength
   * @returns {string}
   */
  function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) {
      return str || '';
    }
    return str.slice(0, maxLength).trimEnd() + '…';
  }

  /**
   * Format an ISO date string as a human-readable date.
   * @param {string} isoString
   * @returns {string}
   */
  function formatDate(isoString) {
    if (!isoString) {
      return '';
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Extract a clean domain name from a URL or domain string.
   * @param {string} domainOrUrl
   * @returns {string}
   */
  function getDomainName(domainOrUrl) {
    const value = String(domainOrUrl || '');
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return value
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    }
  }

  /**
   * Build the bitcoinsearch.xyz results URL for a query.
   * @param {string} query
   * @returns {string}
   */
  function buildSearchUrl(query) {
    const url = new URL(CONFIG.SEARCH_PAGE_ORIGIN);
    url.searchParams.set(CONFIG.SEARCH_PARAM, query);
    return url.toString();
  }

  /**
   * Simple debounce helper.
   * @param {Function} fn
   * @param {number} delayMs
   * @returns {Function}
   */
  function debounce(fn, delayMs) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delayMs);
    };
  }

  /**
   * Search via the extension background service worker.
   * @param {string} query
   * @param {number} [size]
   * @returns {Promise<Array>}
   */
  async function searchExtension(query, size = CONFIG.DEFAULT_RESULT_SIZE) {
    const response = await chrome.runtime.sendMessage({
      action: 'search',
      query: String(query || '').trim(),
      size: Math.max(1, Math.min(size, 25))
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Search failed');
    }

    const hits = response.hits;
    if (!Array.isArray(hits)) {
      throw new Error('Unexpected response format');
    }

    return hits;
  }

  /**
   * Create a small globe icon element.
   * @returns {SVGSVGElement}
   */
  function createGlobeIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 0 1 0-16 8 8 0 0 1 0 16zm0-14a6 6 0 0 0-5.66 4h11.32A6 6 0 0 0 12 6zm0 12a6 6 0 0 0 5.66-4H6.34A6 6 0 0 0 12 18z'
    );

    svg.appendChild(path);
    return svg;
  }

  /**
   * Create a single search result DOM element.
   * @param {object} hit
   * @param {object} [options]
   * @returns {HTMLAnchorElement}
   */
  function createResultElement(hit, options = {}) {
    const source = hit?._source || {};
    const url = isHttpUrl(source.url) ? source.url : '';
    const title = source.title || 'Untitled';
    const domain = source.domain || url;
    const snippetHtml = source.body_formatted || source.body || '';
    const snippet = truncate(stripHtml(snippetHtml), CONFIG.SNIPPET_MAX_LENGTH);
    const date = formatDate(source.created_at);
    const author = source.authors?.[0];

    const anchor = document.createElement('a');
    anchor.className = 'bs-result';
    anchor.href = url || '#';

    if (url) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    if (url && options.onNavigate) {
      anchor.addEventListener('click', options.onNavigate);
    }

    const sourceEl = document.createElement('div');
    sourceEl.className = 'bs-result-source';
    sourceEl.appendChild(createGlobeIcon());
    const sourceText = document.createElement('span');
    sourceText.textContent = getDomainName(domain);
    sourceEl.appendChild(sourceText);
    anchor.appendChild(sourceEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'bs-result-title';
    titleEl.textContent = title;
    anchor.appendChild(titleEl);

    if (snippet) {
      const snippetEl = document.createElement('div');
      snippetEl.className = 'bs-result-snippet';
      snippetEl.textContent = snippet;
      anchor.appendChild(snippetEl);
    }

    const metaParts = [];
    if (date) {
      metaParts.push(date);
    }
    if (author) {
      metaParts.push(author);
    }

    if (metaParts.length) {
      const metaEl = document.createElement('div');
      metaEl.className = 'bs-result-meta';
      metaEl.textContent = metaParts.join(' · ');
      anchor.appendChild(metaEl);
    }

    return anchor;
  }

  /**
   * Render status text (loading, empty, error) into a container.
   * @param {HTMLElement} container
   * @param {string} type
   * @param {string} message
   */
  function setStatus(container, type, message) {
    container.innerHTML = '';
    const el = document.createElement('div');
    el.className = `bs-${type}`;
    el.textContent = message;
    container.appendChild(el);
  }

  /**
   * Render search hits into a container using safe DOM construction.
   * @param {HTMLElement} container
   * @param {Array} hits
   * @param {object} [options]
   */
  function renderResults(container, hits, options = {}) {
    container.innerHTML = '';

    if (!hits?.length) {
      setStatus(container, 'empty', 'No results found.');
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const hit of hits) {
      fragment.appendChild(createResultElement(hit, options));
    }
    container.appendChild(fragment);
  }

  /**
   * Read the stored theme preference ('light' or 'dark').
   * @returns {Promise<string>}
   */
  async function getStoredTheme() {
    try {
      const result = await chrome.storage.local.get(THEME_STORAGE_KEY);
      return result[THEME_STORAGE_KEY] === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  /**
   * Persist the theme preference.
   * @param {string} theme
   * @returns {Promise<void>}
   */
  async function setStoredTheme(theme) {
    try {
      await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
    } catch {
      // Ignore storage failures.
    }
  }

  /**
   * Return true when the stored theme is dark.
   * @returns {Promise<boolean>}
   */
  async function isDarkMode() {
    return (await getStoredTheme()) === 'dark';
  }

  /**
   * Toggle the stored theme and return the new value.
   * @returns {Promise<string>}
   */
  async function toggleTheme() {
    const newTheme = (await isDarkMode()) ? 'light' : 'dark';
    await setStoredTheme(newTheme);
    return newTheme;
  }

  /**
   * Apply or remove the dark-mode class on a root element.
   * @param {Element} root
   * @param {boolean} isDark
   */
  function applyTheme(root, isDark) {
    if (!root) {
      return;
    }
    root.classList.toggle(DARK_CLASS, isDark);
  }

  /**
   * Load the stored theme and apply it to a root element.
   * @param {Element} root
   * @returns {Promise<boolean>}
   */
  async function initTheme(root) {
    const dark = await isDarkMode();
    applyTheme(root, dark);
    return dark;
  }

  /**
   * Notify the background script that the theme changed.
   * @param {string} theme
   */
  async function broadcastTheme(theme) {
    try {
      await chrome.runtime.sendMessage({ action: 'themeChanged', theme });
    } catch {
      // The background script may be unavailable; ignore.
    }
  }

  /**
   * Wire a dark-mode toggle button to the stored theme.
   * @param {HTMLButtonElement} button
   * @param {Element} root
   */
  function attachThemeToggle(button, root) {
    if (!button) {
      return;
    }
    button.addEventListener('click', async () => {
      const theme = await toggleTheme();
      applyTheme(root, theme === 'dark');
      broadcastTheme(theme);
    });
  }

  /**
   * Bind search behavior to an input and results container.
   * @param {HTMLInputElement} input
   * @param {HTMLElement} resultsContainer
   * @param {object} [options]
   */
  function bindSearchInput(input, resultsContainer, options = {}) {
    const size = options.size || CONFIG.DEFAULT_RESULT_SIZE;
    const debounceMs = options.debounceMs || CONFIG.DEBOUNCE_MS;

    const runSearch = debounce(async (query) => {
      if (!query) {
        resultsContainer.innerHTML = '';
        return;
      }

      setStatus(resultsContainer, 'loading', 'Searching…');

      try {
        const hits = await searchExtension(query, size);
        renderResults(resultsContainer, hits, options);
      } catch {
        setStatus(resultsContainer, 'error', 'Search failed. Please try again.');
      }
    }, debounceMs);

    input.addEventListener('input', (event) => {
      const query = event.target.value.trim();
      if (!query) {
        resultsContainer.innerHTML = '';
        return;
      }
      runSearch(query);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && input.value.trim()) {
        event.preventDefault();
        window.open(buildSearchUrl(input.value.trim()), '_blank');
        if (options.onNavigate) {
          options.onNavigate();
        }
      }
    });
  }

  global.BitcoinSearch = {
    CONFIG,
    buildSearchUrl,
    debounce,
    searchExtension,
    createResultElement,
    renderResults,
    setStatus,
    bindSearchInput,
    isDarkMode,
    toggleTheme,
    applyTheme,
    initTheme,
    broadcastTheme,
    attachThemeToggle
  };
})(typeof window !== 'undefined' ? window : this);
