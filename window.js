(function () {
  'use strict';

  const input = document.querySelector('.bs-input');
  const results = document.querySelector('.bs-results');
  const closeBtn = document.querySelector('.bs-close');
  const searchBtn = document.querySelector('.bs-search-btn');
  const themeToggle = document.querySelector('.bs-theme-toggle');

  if (!input || !results) {
    return;
  }

  BitcoinSearch.initTheme(document.documentElement);
  BitcoinSearch.attachThemeToggle(themeToggle, document.documentElement);

  function navigateToSearch() {
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    window.open(BitcoinSearch.buildSearchUrl(query), '_blank');
    window.close();
  }

  BitcoinSearch.bindSearchInput(input, results, {
    size: BitcoinSearch.CONFIG.DEFAULT_RESULT_SIZE,
    onNavigate: () => window.close()
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', navigateToSearch);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => window.close());
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      window.close();
    }
  });

  input.focus();
})();
