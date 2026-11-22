/* Home screen: a live, looping Perfect Timing round played by a bot. Same colors, rings and judgements as the real mode. */
(function () {
  'use strict';
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const label = document.getElementById('hd-label'), scoreEl = document.getElementById('hd-score');
  const LANES = [{k:'Q', c:'#ff3b4e'}, {k:'W', c:'#3d7bff'}, {k:'E', c:'#19e6b0'}, {k:'R', c:'#b455ff'}, {k:'T', c:'#ffe533'}];
  const JUDGE = [{n:'PERFECT', ms:45, pts:100, c:'#ffffff'}, {n:'GREAT', ms:95, pts:70, c:'#19e6b0'}, {n:'GOOD', ms:160, pts:40, c:'#ffe533'}];
  const APPROACH = 1500, GAP = 820;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, t = 0, last = 0, nextSpawn = 400, rings = [], pops = [], bursts = [], pressed = [0, 0, 0, 0, 0];
  let score = 0, combo = 0, count = 0;

  function resize() {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  window.addEventListener('resize', resize);

  function spawn() {
    count++;
    const lane = Math.floor(Math.random() * 5);
    // the bot is good, not perfect: most hits land inside 80 ms, now and then it flubs one
    const flub = count % 9 === 0;
    const err = flub ? (Math.random() < .5 ? -1 : 1) * (190 + Math.random() * 60) : (Math.random() - .5) * 150;
    rings.push({lane, born: t, hit: t + APPROACH, press: t + APPROACH + err, done: false});
  }
  function resolve(ring) {
    ring.done = true; pressed[ring.lane] = t;
    const err = ring.press - ring.hit, j = JUDGE.find(e => Math.abs(err) <= e.ms);
    if (j) { combo++; score += j.pts * Math.min(5, 1 + Math.floor(combo / 4)); pops.push({t0: t, text: j.n, c: j.c}); }
    else { combo = 0; pops.push({t0: t, text: 'MISS', c: '#ff5a5a'}); }
    bursts.push({t0: t, c: LANES[ring.lane].c});
    label.textContent = 'COMBO ×' + Math.min(5, 1 + Math.floor(combo / 4)); scoreEl.textContent = String(score);
  }

  function glow(cx, cy, r, color, w, blur, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(.5, r), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0e16'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * .42, target = Math.min(W, H) * .095, start = Math.min(W, H) * .37;
    // arena: faint guide rings and cross hairs
    ctx.strokeStyle = 'rgba(120,135,170,.16)'; ctx.lineWidth = 1;
    [target * 2.2, target * 3.6, start].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - start - 8, cy); ctx.lineTo(cx - target * 1.5, cy); ctx.moveTo(cx + target * 1.5, cy); ctx.lineTo(cx + start + 8, cy);
    ctx.moveTo(cx, cy - start - 8); ctx.lineTo(cx, cy - target * 1.5); ctx.moveTo(cx, cy + target * 1.5); ctx.lineTo(cx, cy + start + 8); ctx.stroke();
    // target
    glow(cx, cy, target, '#ffffff', 3, 14, 1);
    // rings
    rings.forEach(ring => {
      const u = (t - ring.born) / APPROACH; if (u < 0 || ring.done && u > 1.02) return;
      const r = start + (target - start) * Math.min(1.02, u);
      const a = Math.min(1, u * 5);
      glow(cx, cy, r, LANES[ring.lane].c, 5, 18, a); glow(cx, cy, r, '#ffffff', 1.5, 4, a * .8);
    });
    bursts = bursts.filter(b => t - b.t0 < 420);
    bursts.forEach(b => { const p = (t - b.t0) / 420; glow(cx, cy, target * (1 + p * .9), b.c, 5 * (1 - p) + .5, 18, 1 - p); });
    pops = pops.filter(p => t - p.t0 < 800);
    pops.forEach(p => {
      const k = (t - p.t0) / 800;
      ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.textAlign = 'center'; ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 12;
      ctx.font = '400 20px "Bungee", sans-serif'; ctx.fillText(p.text, cx, cy + target + 34 - k * 18); ctx.restore();
    });
    // key row
    const kw = 30, gap = 10, x0 = cx - (5 * kw + 4 * gap) / 2, y = H - 26;
    LANES.forEach((l, i) => {
      const down = t - pressed[i] < 130, x = x0 + i * (kw + gap) + kw / 2;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, kw / 2 - 1, 0, Math.PI * 2);
      ctx.fillStyle = down ? l.c : 'rgba(255,255,255,.05)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = l.c; ctx.shadowColor = l.c; ctx.shadowBlur = down ? 14 : 0; ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = down ? '#0a0c12' : l.c; ctx.font = '400 13px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.k, x, y + 1); ctx.restore();
    });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(64, now - (last || now)); last = now;
    const home = document.getElementById('home-screen');
    if (document.hidden || !home || home.classList.contains('hidden') || !W) { if (!W) resize(); return; }
    t += dt;
    if (t >= nextSpawn) { spawn(); nextSpawn = t + GAP + Math.random() * 380; }
    rings.forEach(r => { if (!r.done && t >= r.press) resolve(r); });
    rings = rings.filter(r => !(r.done && t - r.hit > 1200));
    draw();
  }
  resize();
  if (reduce) {
    t = 900; rings = [{lane: 2, born: 0, hit: 1500, press: 1500, done: false}, {lane: 0, born: 300, hit: 1800, press: 1800, done: false}]; draw();
  } else requestAnimationFrame(frame);
})();
