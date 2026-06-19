(function () {
  'use strict';

  const input = document.querySelector('.bs-input');
  const results = document.querySelector('.bs-results');
  const searchBtn = document.querySelector('.bs-search-btn');

  if (!input || !results) {
    return;
  }

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

  input.focus();
})();
