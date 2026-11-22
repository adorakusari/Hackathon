/* Mode tiles: feed each tile with the player's real personal best, and the subtitle with their fastest reaction. */
(function () {
  'use strict';
  const UNITS = {'click-best':' CPS', 'code-best':' WPM', 'timing-best':' PTS', 'targetlock-best':' PTS'};
  function readBest(src) {
    if (src === 'mystery') {
      try { const n = parseInt(localStorage.getItem('rsa-mystery-done') || '0', 10); return n ? 'Completed ' + n + '×' : 'Not played yet'; } catch (e) { return 'Not played yet'; }
    }
    const el = document.getElementById(src);
    const text = el ? el.textContent.trim() : '';
    if (!text || text === '—' || text === '-' || text === '0') return 'Not played yet';
    return 'Best: ' + (/^[\d.,]+$/.test(text) ? text + (UNITS[src] || '') : text);
  }
  function refresh() {
    document.querySelectorAll('.tile-best').forEach(node => {
      const text = readBest(node.dataset.src);
      if (node.textContent !== text) node.textContent = text;
      node.classList.toggle('empty', text === 'Not played yet');
    });
    const sub = document.getElementById('play-subtitle'), color = document.getElementById('color-best');
    if (sub && color) {
      const t = color.textContent.trim();
      const next = /MS/i.test(t) ? '7 modes. Your fastest reaction: ' + t.replace(/\s*MS/i, ' ms') + '.' : '7 modes. Pick one and set your first record.';
      if (sub.textContent !== next) sub.textContent = next;
    }
  }
  refresh(); setInterval(refresh, 700);
})();
