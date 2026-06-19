(function (global) {
  'use strict';

  const CONFIG = {
    API_URL: 'https://bitcoinsearch.xyz/api/elasticSearchProxy/search',
    SEARCH_PAGE_ORIGIN: 'https://bitcoinsearch.xyz',
    SEARCH_PARAM: 'search',
    DEFAULT_RESULT_SIZE: 6,
    DEBOUNCE_MS: 200,
    SNIPPET_MAX_LENGTH: 160
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
   * Strip HTML tags and decode entities to plain text.
   * @param {string} html
   * @returns {string}
   */
  function stripHtml(html) {
    if (!html) {
      return '';
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
    const url = source.url;
    const title = source.title || 'Untitled';
    const domain = source.domain || url;
    const snippetHtml = source.body_formatted || source.body || '';
    const snippet = truncate(stripHtml(snippetHtml), CONFIG.SNIPPET_MAX_LENGTH);
    const date = formatDate(source.created_at);
    const author = source.authors?.[0];

    const anchor = document.createElement('a');
    anchor.className = 'bs-result';
    anchor.href = url || '#';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    if (options.onNavigate) {
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
