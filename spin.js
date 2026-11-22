/* DAILY SPIN: one free spin of the reward wheel every day. Prizes are bonus XP. */
(function () {
  'use strict';
  const PRIZES = [
    {xp:10, color:'#7b3fe4', w:20}, {xp:50, color:'#e0408f', w:8}, {xp:15, color:'#4a6cf7', w:18}, {xp:100, color:'#f2b705', w:3},
    {xp:20, color:'#9b5de5', w:16}, {xp:30, color:'#1fb5c9', w:11}, {xp:25, color:'#e0408f', w:13}, {xp:75, color:'#f28a05', w:5}
  ];
  const SEG = 360 / PRIZES.length, NS = 'http://www.w3.org/2000/svg';
  const modal = document.getElementById('spin-modal');
  const openBtns = [document.getElementById('spin-now-button')];
  const closeBtn = document.getElementById('spin-close');
  const spinBtn = document.getElementById('spin-go');
  const wheel = document.getElementById('spin-wheel');
  const msg = document.getElementById('spin-message');
  const bannerNote = document.getElementById('spin-banner-note');
  const mini = document.getElementById('spin-mini-wheel');
  if (!modal || !wheel) return;
  let rotation = 0, spinning = false;

  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const spunToday = () => { try { return localStorage.getItem('rsa-spin-last') === today(); } catch (e) { return false; } };

  function buildWheel(svg, withText) {
    svg.setAttribute('viewBox', '-100 -100 200 200');
    const r = 96;
    PRIZES.forEach((p, i) => {
      const a0 = (i * SEG - SEG / 2 - 90) * Math.PI / 180, a1 = (i * SEG + SEG / 2 - 90) * Math.PI / 180;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', 'M0 0 L' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2) + ' Z');
      path.setAttribute('fill', p.color); path.setAttribute('stroke', 'rgba(255,255,255,.55)'); path.setAttribute('stroke-width', '1.2');
      svg.appendChild(path);
      if (withText) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('transform', 'rotate(' + (i * SEG) + ') translate(0 -66)');
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#fff'); t.setAttribute('font-weight', '400'); t.setAttribute('font-size', '15');
        t.setAttribute('font-family', 'Bungee, sans-serif'); t.textContent = '+' + p.xp;
        svg.appendChild(t);
        const s = document.createElementNS(NS, 'text');
        s.setAttribute('transform', 'rotate(' + (i * SEG) + ') translate(0 -50)'); s.setAttribute('text-anchor', 'middle'); s.setAttribute('fill', 'rgba(255,255,255,.8)');
        s.setAttribute('font-size', '7'); s.setAttribute('font-weight', '700'); s.textContent = 'XP'; svg.appendChild(s);
      } else {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', (62 * Math.cos((i * SEG - 90) * Math.PI / 180)).toFixed(1)); c.setAttribute('cy', (62 * Math.sin((i * SEG - 90) * Math.PI / 180)).toFixed(1));
        c.setAttribute('r', '9'); c.setAttribute('fill', '#ffd447'); c.setAttribute('stroke', '#fff3b0'); c.setAttribute('stroke-width', '2'); svg.appendChild(c);
      }
    });
    const rim = document.createElementNS(NS, 'circle'); rim.setAttribute('r', r); rim.setAttribute('fill', 'none'); rim.setAttribute('stroke', '#f6e7ff'); rim.setAttribute('stroke-width', '5'); svg.appendChild(rim);
    const hub = document.createElementNS(NS, 'circle'); hub.setAttribute('r', '15'); hub.setAttribute('fill', '#2a0f55'); hub.setAttribute('stroke', '#ffd447'); hub.setAttribute('stroke-width', '4'); svg.appendChild(hub);
  }
  buildWheel(wheel, true);
  if (mini) buildWheel(mini, false);

  function refresh() {
    const done = spunToday();
    spinBtn.disabled = done || spinning;
    spinBtn.textContent = done ? 'COME BACK TOMORROW' : 'SPIN!';
    if (bannerNote) bannerNote.textContent = done ? 'Come back tomorrow for your next free spin!' : '1 free spin ready — win up to +100 XP!';
    const label = document.getElementById('spin-now-label'); if (label) label.textContent = done ? 'SPIN DONE ✓' : 'SPIN NOW';
    msg.textContent = done ? (msg.dataset.won || 'You already used today\'s spin. See you tomorrow!') : 'Tap SPIN for a free reward!';
  }
  function pick() {
    let roll = Math.random() * PRIZES.reduce((a, p) => a + p.w, 0);
    for (let i = 0; i < PRIZES.length; i++) { roll -= PRIZES[i].w; if (roll <= 0) return i; }
    return 0;
  }
  function spin() {
    if (spinning || spunToday()) return;
    spinning = true; spinBtn.disabled = true; msg.textContent = 'Spinning…';
    const idx = pick();
    const jitter = (Math.random() - .5) * SEG * .6;
    const turns = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 1 : 5;
    const current = ((rotation % 360) + 360) % 360;
    rotation += 360 * turns + ((360 - idx * SEG - current + jitter) % 360 + 360) % 360;
    wheel.style.transition = 'transform 5s cubic-bezier(.12,.7,.1,1)';
    wheel.style.transform = 'rotate(' + rotation + 'deg)';
    let ticks = 0; const tick = setInterval(() => { if (++ticks > 24) clearInterval(tick); else playSound('click'); }, 190);
    setTimeout(() => {
      clearInterval(tick); spinning = false;
      try { localStorage.setItem('rsa-spin-last', today()); } catch (e) { }
      const prize = PRIZES[idx];
      awardXP(prize.xp);
      msg.dataset.won = 'You won +' + prize.xp + ' XP today! Come back tomorrow.';
      playSound(prize.xp >= 50 ? 'levelup' : 'reward');
      launchConfetti(prize.xp >= 50 ? 220 : 110); popText('+' + prize.xp + ' XP!');
      refresh(); msg.textContent = 'You won +' + prize.xp + ' XP!';
      if (typeof renderStats === 'function') renderStats();
    }, 5200);
  }
  function open() { modal.classList.remove('hidden'); playSound('click'); refresh(); }
  function close() { if (spinning) return; modal.classList.add('hidden'); }
  openBtns.forEach(b => b && b.addEventListener('click', open));
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
  spinBtn.addEventListener('click', spin);
  refresh();
})();
