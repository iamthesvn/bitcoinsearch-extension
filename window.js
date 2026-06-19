(function () {
  'use strict';

  const input = document.querySelector('.bs-input');
  const results = document.querySelector('.bs-results');
  const closeBtn = document.querySelector('.bs-close');

  if (!input || !results) {
    return;
  }

  BitcoinSearch.bindSearchInput(input, results, {
    size: BitcoinSearch.CONFIG.DEFAULT_RESULT_SIZE
  });

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
