(function (global) {
  'use strict';

  const CONFIG = {
    API_URL: 'https://bitcoinsearch.xyz/api/elasticSearchProxy/search',
    SEARCH_PAGE_ORIGIN: 'https://bitcoinsearch.xyz',
    SEARCH_PARAM: 'search',
    DEFAULT_RESULT_SIZE: 6,
    DEBOUNCE_MS: 200
  };

  /**
   * Escape HTML special characters to prevent XSS when inserting text.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  /**
   * Extract hostname from a URL, returning the raw URL on failure.
   * @param {string} url
   * @returns {string}
   */
  function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
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
   * Create a single search result DOM element.
   * @param {object} hit
   * @returns {HTMLAnchorElement}
   */
  function createResultElement(hit) {
    const source = hit?._source || {};
    const url = source.url;
    const title = source.title || 'Untitled';
    const domain = source.domain || getHostname(url);

    const anchor = document.createElement('a');
    anchor.className = 'bs-result';
    anchor.href = url || '#';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    const titleEl = document.createElement('div');
    titleEl.className = 'bs-result-title';
    titleEl.textContent = title;
    anchor.appendChild(titleEl);

    if (domain) {
      const metaEl = document.createElement('div');
      metaEl.className = 'bs-result-meta';
      metaEl.textContent = domain;
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
   */
  function renderResults(container, hits) {
    container.innerHTML = '';

    if (!hits?.length) {
      setStatus(container, 'empty', 'No results found.');
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const hit of hits) {
      fragment.appendChild(createResultElement(hit));
    }
    container.appendChild(fragment);
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
        renderResults(resultsContainer, hits);
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
      }
    });
  }

  global.BitcoinSearch = {
    CONFIG,
    escapeHtml,
    getHostname,
    buildSearchUrl,
    debounce,
    searchExtension,
    createResultElement,
    renderResults,
    setStatus,
    bindSearchInput
  };
})(typeof window !== 'undefined' ? window : this);
