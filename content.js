(function () {
  'use strict';

  // Prevent double-injection when the background script dynamically injects us.
  if (window.__bitcoinSearchInitialized) {
    return;
  }
  window.__bitcoinSearchInitialized = true;

  const OVERLAY_ID = 'bitcoinsearch-overlay';
  const BRAND_ORANGE = '#f7931a';
  const BRAND_DARK = '#171923';

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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      }
      * {
        box-sizing: border-box;
      }
      .bs-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(4px);
      }
      .bs-modal {
        position: fixed;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        width: min(640px, 92vw);
        background: ${BRAND_DARK};
        border: 1px solid #2d3748;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 76vh;
      }
      .bs-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #2d3748;
      }
      .bs-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ffffff;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.01em;
      }
      .bs-logo svg {
        flex-shrink: 0;
      }
      .bs-close {
        background: transparent;
        border: none;
        color: #a0aec0;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
        transition: background 0.15s, color 0.15s;
      }
      .bs-close:hover,
      .bs-close:focus {
        background: #2d3748;
        color: #ffffff;
        outline: none;
      }
      .bs-input {
        width: 100%;
        padding: 18px 20px;
        font-size: 17px;
        color: #ffffff;
        background: #1a202c;
        border: none;
        border-bottom: 1px solid #2d3748;
        outline: none;
      }
      .bs-input::placeholder {
        color: #718096;
      }
      .bs-input:focus {
        box-shadow: inset 0 -2px 0 0 ${BRAND_ORANGE};
      }
      .bs-results {
        overflow-y: auto;
        padding: 8px 0;
      }
      .bs-loading,
      .bs-empty,
      .bs-error {
        padding: 28px 20px;
        text-align: center;
        color: #a0aec0;
        font-size: 14px;
      }
      .bs-error {
        color: #fc8181;
      }
      .bs-result {
        display: block;
        padding: 14px 20px;
        text-decoration: none;
        border-left: 3px solid transparent;
        transition: background 0.12s, border-color 0.12s;
      }
      .bs-result:hover,
      .bs-result:focus,
      .bs-result.active {
        background: #1a202c;
        border-left-color: ${BRAND_ORANGE};
        outline: none;
      }
      .bs-result-title {
        color: #ffffff;
        font-size: 15px;
        font-weight: 600;
        line-height: 1.35;
        margin-bottom: 4px;
      }
      .bs-result-meta {
        color: ${BRAND_ORANGE};
        font-size: 12px;
        font-weight: 500;
      }
      .bs-footer {
        padding: 12px 20px;
        border-top: 1px solid #2d3748;
        color: #718096;
        font-size: 12px;
        text-align: center;
      }
      .bs-footer kbd {
        background: #2d3748;
        color: #e2e8f0;
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
    svg.setAttribute('width', '26');
    svg.setAttribute('height', '26');
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
    path.setAttribute('fill', '#171923');

    svg.appendChild(circle);
    svg.appendChild(path);
    return svg;
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
    logoText.textContent = 'Bitcoin Search';
    logo.appendChild(logoText);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bs-close';
    closeBtn.setAttribute('aria-label', 'Close overlay');
    closeBtn.textContent = '×';

    header.appendChild(logo);
    header.appendChild(closeBtn);

    const input = document.createElement('input');
    input.className = 'bs-input';
    input.type = 'text';
    input.placeholder = "Search bitcoin's technical ecosystem…";
    input.autocomplete = 'off';

    const results = document.createElement('div');
    results.className = 'bs-results';
    results.setAttribute('aria-live', 'polite');

    const footer = document.createElement('div');
    footer.className = 'bs-footer';
    footer.innerHTML =
      '<span>Press <kbd>Enter</kbd> to search on bitcoinsearch.xyz · <kbd>Esc</kbd> to close · <kbd>↑</kbd><kbd>↓</kbd> to navigate</span>';

    modal.appendChild(header);
    modal.appendChild(input);
    modal.appendChild(results);
    modal.appendChild(footer);

    container.appendChild(backdrop);
    container.appendChild(modal);

    shadow.appendChild(container);
    shadow.appendChild(getStyles());

    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', hideOverlay);
    backdrop.addEventListener('click', hideOverlay);

    bindOverlaySearch(input, results);

    results.addEventListener('click', (event) => {
      if (event.target.closest('.bs-result')) {
        hideOverlay();
      }
    });

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
        BitcoinSearch.renderResults(resultsEl, hits);
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
  });
})();
