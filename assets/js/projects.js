// assets/js/projects.js — hub filter chips. Progressive enhancement only:
// the no-JS page shows all 30 cards; this script just toggles [hidden].
(function () {
  'use strict';
  var grid = document.querySelector('[data-projects-grid]');
  if (!grid) return;
  var cards = [].slice.call(grid.querySelectorAll('.pjx-card'));
  var chips = [].slice.call(document.querySelectorAll('.pjx-chip'));
  var count = document.querySelector('[data-projects-count]');
  var state = { status: 'all', line: 'all' };

  function apply() {
    var shown = 0;
    cards.forEach(function (c) {
      var okS = state.status === 'all' || c.getAttribute('data-status') === state.status;
      var okL = state.line === 'all' || (' ' + c.getAttribute('data-lines') + ' ').indexOf(' ' + state.line + ' ') !== -1;
      var show = okS && okL;
      if (show) shown++;
      if (show) c.removeAttribute('hidden'); else c.setAttribute('hidden', '');
    });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' projects';
    chips.forEach(function (b) {
      var g = b.getAttribute('data-filter-group');
      b.setAttribute('aria-pressed', String(state[g] === b.getAttribute('data-filter-value')));
    });
  }
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      state[b.getAttribute('data-filter-group')] = b.getAttribute('data-filter-value');
      apply();
    });
  });
  // Deep links: #current/#completed preselect status; #roads #civil #building
  // #micro #water #em #oil-and-gas preselect a line. Tokens combine with "+"
  // (#roads+completed), which is how the retired discipline listing pages
  // — "Roads and Bridges, completed" and friends — map onto hub filter state.
  var lineAlias = { 'oil-and-gas': 'oil' };
  function hasLine(token) {
    return cards.some(function (c) {
      return (' ' + c.getAttribute('data-lines') + ' ').indexOf(' ' + token + ' ') !== -1;
    });
  }
  var raw = (location.hash || '').replace('#', '');
  if (raw) {
    var applied = false;
    raw.split('+').forEach(function (tok) {
      tok = decodeURIComponent(tok).trim();
      if (!tok) return;
      if (tok === 'current' || tok === 'completed') { state.status = tok; applied = true; return; }
      tok = lineAlias[tok] || tok;
      if (hasLine(tok)) { state.line = tok; applied = true; }
    });
    if (applied) apply();
  }
})();
