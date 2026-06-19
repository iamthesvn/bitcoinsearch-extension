(function () {
  'use strict';

  // Prevent double-injection when the background script dynamically injects us.
  if (window.__bitcoinSearchInitialized) {
    return;
  }
  window.__bitcoinSearchInitialized = true;

  const OVERLAY_ID = 'bitcoinsearch-overlay';

  let overlay = null;
  let shadowRoot = null;
  let previouslyFocusedElement = null;

  function whenBodyReady() {
    return new Promise((resolve) => {
      if (document.body) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    });
  }

  function getStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        --bs-bg: #fafafa;
        --bs-surface: #ffffff;
        --bs-cream: #f6f0e6;
        --bs-border: #e5e7eb;
        --bs-text: #292929;
        --bs-muted: #636366;
        --bs-placeholder: #999999;
        --bs-orange: #f7931a;
        --bs-orange-dark: #e8782b;
        --bs-orange-light: #f6a73f;
        --bs-error: #dc2626;
        --bs-hover: #fff0e0;
        --bs-logo-fill: #171923;
        --bs-radius: 12px;
        --bs-gradient: linear-gradient(92.78deg, #e8782b, #f6a73f 101.1%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      }
      :host(.bs-dark) {
        --bs-bg: #0f1115;
        --bs-surface: #1a1d23;
        --bs-cream: #181410;
        --bs-border: #2c2f36;
        --bs-text: #f1f1f1;
        --bs-muted: #9ca3af;
        --bs-placeholder: #6b7280;
        --bs-hover: #2a1d12;
        --bs-logo-fill: #ffffff;
      }
      * {
        box-sizing: border-box;
      }
      .bs-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px);
      }
      .bs-modal {
        position: fixed;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        width: min(680px, 92vw);
        background: var(--bs-bg);
        border: 1px solid var(--bs-border);
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 76vh;
      }
      .bs-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background: var(--bs-cream);
        border-bottom: 1px solid var(--bs-border);
      }
      .bs-logo {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .bs-logo svg {
        flex-shrink: 0;
      }
      .bs-logo-text {
        font-size: 20px;
        font-weight: 700;
        font-style: italic;
        letter-spacing: -0.02em;
        background: var(--bs-gradient);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .bs-close {
        background: transparent;
        border: none;
        color: var(--bs-muted);
        font-size: 26px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 8px;
        transition: background 0.15s, color 0.15s;
      }
      .bs-close:hover,
      .bs-close:focus {
        background: var(--bs-hover);
        color: var(--bs-text);
        outline: none;
      }
      .bs-search-box {
        position: relative;
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--bs-border);
      }
      .bs-input {
        width: 100%;
        padding: 14px 50px 14px 18px;
        font-size: 16px;
        color: var(--bs-text);
        background: var(--bs-surface);
        border: 1px solid var(--bs-border);
        border-radius: var(--bs-radius);
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .bs-input::placeholder {
        color: var(--bs-placeholder);
      }
      .bs-input:focus {
        border-color: var(--bs-orange);
        box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.15);
      }
      .bs-search-btn {
        position: absolute;
        right: 26px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: var(--bs-gradient);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
      }
      .bs-search-btn:hover,
      .bs-search-btn:focus {
        opacity: 0.92;
        outline: none;
      }
      .bs-search-btn:active {
        transform: translateY(-50%) scale(0.96);
      }
      .bs-results {
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .bs-loading,
      .bs-empty,
      .bs-error {
        padding: 28px 20px;
        text-align: center;
        color: var(--bs-muted);
        font-size: 14px;
      }
      .bs-error {
        color: var(--bs-error);
      }
      .bs-result {
        display: block;
        padding: 14px;
        text-decoration: none;
        background: var(--bs-surface);
        border: 1px solid var(--bs-border);
        border-radius: var(--bs-radius);
        transition: border-color 0.12s, background 0.12s, transform 0.08s;
      }
      .bs-result:hover,
      .bs-result:focus,
      .bs-result.active {
        border-color: var(--bs-orange);
        background: var(--bs-hover);
        outline: none;
        transform: translateY(-1px);
      }
      .bs-result-source {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--bs-muted);
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 6px;
      }
      .bs-result-title {
        color: var(--bs-text);
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        margin-bottom: 6px;
      }
      .bs-result-snippet {
        color: var(--bs-muted);
        font-size: 13px;
        line-height: 1.45;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .bs-result-meta {
        color: var(--bs-orange-dark);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .bs-footer {
        padding: 12px 20px;
        border-top: 1px solid var(--bs-border);
        color: var(--bs-muted);
        font-size: 12px;
        text-align: center;
      }
      .bs-footer kbd {
        background: var(--bs-hover);
        color: var(--bs-text);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 11px;
      }
    `;
    return style;
  }

  function createLogoSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '12');
    circle.setAttribute('fill', '#f7931a');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M15.7 10.3c.2-1.4-.9-2.2-2.4-2.7l.5-1.9-1.2-.3-.4 1.8c-.3-.1-.7-.2-1.1-.2l.4-1.8-1.2-.3-.5 1.9c-.3-.1-.6-.2-.8-.3l-.1-.1-1.7-.4-.3 1.2s.9.2.9.2c.5.1.6.5.5.8l-.5 2.2v.1l-.8 3.1c-.1.2-.3.5-.7.4.1.1-.8-.2-.8-.2l-.6 1.4 1.5.4c.3.1.6.2.9.2l-.5 2 1.2.3.5-1.9c.3.1.7.2 1.1.3l-.5 1.9 1.2.3.5-2c2 .5 3.5-.2 4.1-1.6.5-1.2 0-2-.9-2.5.7-.2 1.2-.8 1.4-1.8zm-2.4 3.8c-.4 1.3-2.2.6-2.8.4l.5-2c.6.2 2.6.5 2.3 1.6zm.3-3.8c-.3 1.1-1.8.5-2.3.4l.4-1.8c.5.1 2.2.4 1.9 1.4z'
    );
    path.setAttribute('fill', 'var(--bs-logo-fill)');

    svg.appendChild(circle);
    svg.appendChild(path);
    return svg;
  }

  function createSearchIconSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', 'm21 21-4.35-4.35');

    svg.appendChild(circle);
    svg.appendChild(line);
    return svg;
  }

  function applyOverlayTheme(isDark) {
    if (!overlay) {
      return;
    }
    overlay.classList.toggle('bs-dark', isDark);
  }

  async function createOverlay() {
    if (overlay) {
      return overlay;
    }

    await whenBodyReady();

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    const shadow = overlay.attachShadow({ mode: 'open' });
    shadowRoot = shadow;

    const container = document.createElement('div');
    container.className = 'bs-container';

    const backdrop = document.createElement('div');
    backdrop.className = 'bs-backdrop';

    const modal = document.createElement('div');
    modal.className = 'bs-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Bitcoin Search');

    const header = document.createElement('div');
    header.className = 'bs-header';

    const logo = document.createElement('div');
    logo.className = 'bs-logo';
    logo.appendChild(createLogoSvg());
    const logoText = document.createElement('span');
    logoText.className = 'bs-logo-text';
    logoText.textContent = 'bitcoin search';
    logo.appendChild(logoText);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bs-close';
    closeBtn.setAttribute('aria-label', 'Close overlay');
    closeBtn.textContent = '×';

    header.appendChild(logo);
    header.appendChild(closeBtn);

    const searchBox = document.createElement('div');
    searchBox.className = 'bs-search-box';

    const input = document.createElement('input');
    input.className = 'bs-input';
    input.type = 'text';
    input.placeholder = "Search bitcoin's technical ecosystem…";
    input.autocomplete = 'off';

    const searchBtn = document.createElement('button');
    searchBtn.className = 'bs-search-btn';
    searchBtn.type = 'button';
    searchBtn.setAttribute('aria-label', 'Search');
    searchBtn.appendChild(createSearchIconSvg());

    searchBox.appendChild(input);
    searchBox.appendChild(searchBtn);

    const results = document.createElement('div');
    results.className = 'bs-results';
    results.setAttribute('aria-live', 'polite');

    const footer = document.createElement('div');
    footer.className = 'bs-footer';
    footer.innerHTML =
      '<span>Press <kbd>Enter</kbd> to search on bitcoinsearch.xyz · <kbd>Esc</kbd> to close · <kbd>↑</kbd><kbd>↓</kbd> to navigate</span>';

    modal.appendChild(header);
    modal.appendChild(searchBox);
    modal.appendChild(results);
    modal.appendChild(footer);

    container.appendChild(backdrop);
    container.appendChild(modal);

    shadow.appendChild(container);
    shadow.appendChild(getStyles());

    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', hideOverlay);
    backdrop.addEventListener('click', hideOverlay);

    searchBtn.addEventListener('click', () => {
      const query = input.value.trim();
      if (!query) {
        input.focus();
        return;
      }
      window.open(BitcoinSearch.buildSearchUrl(query), '_blank');
      hideOverlay();
    });

    bindOverlaySearch(input, results);

    applyOverlayTheme(await BitcoinSearch.isDarkMode());

    return overlay;
  }

  function getResultItems(resultsEl) {
    return Array.from(resultsEl.querySelectorAll('.bs-result'));
  }

  /**
   * Handle arrow-key navigation through result items.
   * Returns true if the event was handled.
   */
  function handleResultsNavigation(event, resultsEl) {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      return false;
    }

    const items = getResultItems(resultsEl);
    if (!items.length) {
      return false;
    }

    const activeIndex = items.findIndex((item) => item.classList.contains('active'));

    if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        items[activeIndex].click();
        return true;
      }
      return false;
    }

    event.preventDefault();

    let nextIndex = activeIndex;
    if (event.key === 'ArrowDown') {
      nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
    }

    if (nextIndex !== activeIndex) {
      items.forEach((item) => item.classList.remove('active'));
      items[nextIndex].classList.add('active');
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    return true;
  }

  function bindOverlaySearch(input, resultsEl) {
    const runSearch = BitcoinSearch.debounce(async (query) => {
      if (!query) {
        resultsEl.innerHTML = '';
        return;
      }
      BitcoinSearch.setStatus(resultsEl, 'loading', 'Searching…');
      try {
        const hits = await BitcoinSearch.searchExtension(query, 6);
        BitcoinSearch.renderResults(resultsEl, hits, { onNavigate: hideOverlay });
      } catch {
        BitcoinSearch.setStatus(resultsEl, 'error', 'Search failed. Please try again.');
      }
    }, BitcoinSearch.CONFIG.DEBOUNCE_MS);

    input.addEventListener('input', (event) => {
      const query = event.target.value.trim();
      if (!query) {
        resultsEl.innerHTML = '';
        return;
      }
      runSearch(query);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        hideOverlay();
        return;
      }

      if (handleResultsNavigation(event, resultsEl)) {
        return;
      }

      if (event.key === 'Enter' && input.value.trim()) {
        event.preventDefault();
        window.open(BitcoinSearch.buildSearchUrl(input.value.trim()), '_blank');
        hideOverlay();
      }
    });
  }

  async function showOverlay() {
    previouslyFocusedElement = document.activeElement;
    const el = await createOverlay();
    el.style.display = 'block';
    setTimeout(() => {
      const input = shadowRoot.querySelector('.bs-input');
      if (input) {
        input.focus();
      }
    }, 50);
  }

  function hideOverlay() {
    if (overlay) {
      overlay.style.display = 'none';
    }
    if (previouslyFocusedElement && previouslyFocusedElement.focus) {
      try {
        previouslyFocusedElement.focus();
      } catch {
        // Ignore focus errors on cross-origin elements.
      }
    }
  }

  async function toggleOverlay() {
    if (overlay && overlay.style.display === 'block') {
      hideOverlay();
    } else {
      await showOverlay();
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ ok: true });
      return false;
    }
    if (request.action === 'toggle') {
      toggleOverlay();
      sendResponse({ ok: true });
      return false;
    }
    if (request.action === 'themeChanged') {
      applyOverlayTheme(request.theme === 'dark');
      sendResponse({ ok: true });
      return false;
    }
  });
})();
