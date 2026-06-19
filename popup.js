(function () {
  'use strict';

  const input = document.querySelector('.bs-input');
  const results = document.querySelector('.bs-results');

  if (!input || !results) {
    return;
  }

  BitcoinSearch.bindSearchInput(input, results, {
    size: BitcoinSearch.CONFIG.DEFAULT_RESULT_SIZE
  });

  input.focus();
})();
