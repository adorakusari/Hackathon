/* TARGET LOCK: many targets appear; click only the correct one, as fast as you can. */
(function () {
  'use strict';
  const screen = document.getElementById('targetlock-screen');
  const canvas = document.getElementById('targetlock-canvas');
  if (!screen || !canvas) return;
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('targetlock-overlay');
  const overlayTitle = document.getElementById('targetlock-overlay-title');
  const overlayText = document.getElementById('targetlock-overlay-text');
  const startButton = document.getElementById('targetlock-start-button');
  const resultBox = document.getElementById('targetlock-result');
  const ROUNDS = 15;
  const COLORS = {cyan:'#19d8e6', pink:'#ff3d7a'};
  let state = null, frame = 0, width = 800, height = 450, dpr = 1;
  const mouse = {x:400, y:225, inside:false};
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(280, Math.round(rect.width || 800));
    height = Math.round(Math.max(300, Math.min(520, width * (width < 520 ? .85 : .6))));
    canvas.style.height = height + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (!mouse.inside) { mouse.x = width / 2; mouse.y = height / 2; }
    if (!state || !state.running) drawFrame(performance.now());
  }
  function ring(x, y, r, color, lw, blur, alpha) {
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r), 0, 6.2832); ctx.stroke(); ctx.restore();
  }
  function drawTarget(t, now) {
    const age = Math.min(1, (now - t.born) / 220);
    const r = t.r * (.4 + .6 * age) * (1 + (reduced() ? 0 : .04 * Math.sin(now / 260 + t.phase)));
    const c = COLORS[t.color];
    ring(t.x, t.y, r, c, Math.max(2, t.r * .14), 14, age);
    ring(t.x, t.y, r * .38, c, Math.max(1.5, t.r * .1), 8, age);
    ctx.save(); ctx.globalAlpha = age; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(1, r * .1), 0, 6.2832); ctx.fill(); ctx.restore();
    if (t.flash) { const p = (now - t.flash.t0) / 400; if (p < 1) ring(t.x, t.y, t.r * (1 + p * 1.2), t.flash.color, 4, 20, 1 - p); }
  }
  function drawBg(now) {
    ctx.fillStyle = '#030a14'; ctx.fillRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, Math.max(width, height) * .65);
    g.addColorStop(0, 'rgba(20,70,95,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.strokeStyle = 'rgba(25,216,230,.18)'; ctx.lineWidth = 1.5;
    const m = 14, c = 26; // HUD frame with cut corners
    ctx.beginPath(); ctx.moveTo(m + c, m); ctx.lineTo(width - m - c, m); ctx.lineTo(width - m, m + c); ctx.lineTo(width - m, height - m - c); ctx.lineTo(width - m - c, height - m);
    ctx.lineTo(m + c, height - m); ctx.lineTo(m, height - m - c); ctx.lineTo(m, m + c); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  function drawCrosshair(now) {
    const lock = state && state.running && state.locked;
    const x = mouse.x, y = mouse.y, base = width < 480 ? 20 : 26;
    const r = lock ? base * .8 : base * (1 + (reduced() ? 0 : .06 * Math.sin(now / 200)));
    const col = '#19d8e6';
    ring(x, y, r + 10, col, 1, 6, .35);
    ring(x, y, r, col, 3, 14, 1);
    ring(x, y, r * .4, '#ff3d7a', 2.5, 8, 1);
    ctx.save(); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.lineWidth = 2.5;
    const gap = r + 12, len = width < 480 ? 34 : 56;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { ctx.beginPath(); ctx.moveTo(x + d[0] * gap, y + d[1] * gap); ctx.lineTo(x + d[0] * (gap + len), y + d[1] * (gap + len)); ctx.stroke(); });
    ctx.restore();
  }
  function drawHud(now) {
    const s = state; if (!s) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#19d8e6'; ctx.shadowColor = '#19d8e6'; ctx.shadowBlur = 10;
    ctx.font = '800 ' + (width < 480 ? 12 : 15) + 'px Orbitron, sans-serif';
    ctx.fillText('ROUND ' + Math.min(ROUNDS, s.round + 1) + ' / ' + ROUNDS, width / 2, 38);
    ctx.font = '900 ' + (width < 480 ? 22 : 30) + 'px Orbitron, sans-serif'; ctx.fillText(String(s.score), width / 2, 38 + (width < 480 ? 28 : 36));
    ctx.textAlign = 'left'; ctx.font = '800 ' + (width < 480 ? 11 : 13) + 'px Orbitron, sans-serif';
    ctx.fillText('LOCK ONTO', 34, 44);
    ctx.fillStyle = COLORS[s.rule]; ctx.shadowColor = COLORS[s.rule]; ctx.font = '900 ' + (width < 480 ? 16 : 22) + 'px Orbitron, sans-serif'; ctx.fillText(s.rule.toUpperCase(), 34, 44 + (width < 480 ? 22 : 28));
    ctx.textAlign = 'right'; ctx.fillStyle = '#19d8e6'; ctx.shadowColor = '#19d8e6'; ctx.font = '800 ' + (width < 480 ? 11 : 13) + 'px Orbitron, sans-serif';
    ctx.fillText('COMBO ×' + Math.max(1, Math.min(5, 1 + Math.floor(s.combo / 3))), width - 34, 44);
    ctx.font = '700 ' + (width < 480 ? 10 : 12) + 'px Orbitron, sans-serif'; ctx.fillText(s.combo + ' STREAK', width - 34, 44 + (width < 480 ? 18 : 22));
    if (s.live) { // time bar
      const left = Math.max(0, 1 - (now - s.roundStart) / s.limit);
      ctx.fillStyle = 'rgba(25,216,230,.15)'; ctx.fillRect(width * .2, height - 30, width * .6, 5);
      ctx.fillStyle = left < .3 ? '#ff3d7a' : '#19d8e6'; ctx.fillRect(width * .2, height - 30, width * .6 * left, 5);
    }
    s.popups = s.popups.filter(p => now - p.t0 < 800);
    s.popups.forEach(p => { const k = (now - p.t0) / 800; ctx.globalAlpha = 1 - k; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.textAlign = 'center'; ctx.font = '900 ' + (width < 480 ? 14 : 18) + 'px Orbitron, sans-serif'; ctx.fillText(p.text, p.x, p.y - k * 28); });
    ctx.restore();
  }
  function drawFrame(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBg(now);
    if (state) { state.targets.forEach(t => { if (!reduced()) { t.x += t.vx; t.y += t.vy; if (t.x < t.r + 20 || t.x > width - t.r - 20) t.vx *= -1; if (t.y < t.r + 70 || t.y > height - t.r - 40) t.vy *= -1; } drawTarget(t, now); }); drawHud(now); }
    else { for (let i = 0; i < 9; i++) drawTarget({x:width * (.12 + (i * .37 % .78)), y:height * (.25 + (i * .29 % .6)), r:16 + (i % 3) * 5, color:i % 3 === 0 ? 'pink' : 'cyan', born:0, phase:i}, now); }
    drawCrosshair(now);
  }

  function layoutTargets(count, r) {
    const list = []; let tries = 0;
    while (list.length < count && tries++ < 400) {
      const x = r + 30 + Math.random() * (width - 2 * r - 60), y = r + 80 + Math.random() * (height - 2 * r - 130);
      if (Math.hypot(x - width / 2, y - height / 2) < r * 1.5 && Math.random() < .5) continue;
      if (list.every(t => Math.hypot(t.x - x, t.y - y) > r * 3)) list.push({x, y});
    }
    return list;
  }
  function nextRound() {
    const s = state; s.live = false;
    if (s.round >= ROUNDS) return setTimeout(finish, 400);
    const progress = s.round / (ROUNDS - 1);
    s.rule = Math.random() < .5 ? 'pink' : 'cyan';
    const r = Math.round((width < 480 ? 20 : 25) * (1 - .25 * progress));
    const total = 6 + Math.round(progress * 6);
    const spots = layoutTargets(total, r);
    const now = performance.now();
    s.targets = spots.map((p, i) => ({x:p.x, y:p.y, r:r + Math.random() * 5, color:i === 0 ? s.rule : (s.rule === 'pink' ? 'cyan' : 'pink'), born:now, phase:Math.random() * 6, vx:(Math.random() - .5) * .5 * (1 + progress), vy:(Math.random() - .5) * .5 * (1 + progress)}));
    s.limit = 2800 - 1100 * progress;
    s.roundStart = now; s.live = true;
  }
  function endRound(delay) { state.live = false; state.round++; setTimeout(() => { if (state && state.running) nextRound(); }, delay); }
  function pointerPos(e) { const rect = canvas.getBoundingClientRect(); return {x:(e.clientX - rect.left) * width / rect.width, y:(e.clientY - rect.top) * height / rect.height}; }
  function onMove(e) { const p = pointerPos(e); mouse.x = p.x; mouse.y = p.y; mouse.inside = true; if (state && state.running) state.locked = state.targets.some(t => Math.hypot(t.x - p.x, t.y - p.y) < t.r + 6); }
  function onDown(e) {
    const s = state; if (!s || !s.running || !s.live) return;
    e.preventDefault(); onMove(e);
    const now = performance.now();
    const hit = s.targets.find(t => Math.hypot(t.x - mouse.x, t.y - mouse.y) <= t.r + 8);
    if (!hit) { s.popups.push({t0:now, x:mouse.x, y:mouse.y - 14, text:'MISS', color:'#ff9a4d'}); s.combo = 0; s.clickMisses++; playSound('error'); return; }
    if (hit.color === s.rule) {
      const rt = now - s.roundStart; s.times.push(rt); s.hits++;
      const speed = Math.max(0, 1 - rt / s.limit);
      const mult = Math.max(1, Math.min(5, 1 + Math.floor(s.combo / 3)));
      const pts = Math.round((50 + 100 * speed) * mult); s.score += pts; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
      hit.flash = {t0:now, color:'#ffffff'}; s.popups.push({t0:now, x:hit.x, y:hit.y - hit.r - 6, text:'+' + pts + '  ' + Math.round(rt) + 'ms', color:'#7dffb3'});
      playSound('combo', Math.max(1, s.combo));
      if (s.combo % 3 === 0 && s.combo <= 12) popText('×' + Math.min(5, 1 + Math.floor(s.combo / 3)) + ' COMBO!');
      s.targets = s.targets.filter(t => t === hit); endRound(380);
    } else {
      s.combo = 0; s.wrong++; hit.flash = {t0:now, color:'#ff3d7a'};
      s.popups.push({t0:now, x:hit.x, y:hit.y - hit.r - 6, text:'WRONG TARGET', color:'#ff5a7a'}); playSound('error'); shakeScreen('sm');
      s.targets = s.targets.filter(t => t === hit); endRound(550);
    }
  }
  function loop(now) {
    if (!state || !state.running) return;
    if (state.live && !document.hidden && now - state.roundStart > state.limit) { state.combo = 0; state.timeouts++; state.popups.push({t0:now, x:width / 2, y:height / 2 + 80, text:'TIME UP', color:'#ff9a4d'}); playSound('error'); state.targets = []; endRound(450); }
    drawFrame(now); frame = requestAnimationFrame(loop);
  }
  function onVisibility() { if (!state || !state.running) return; if (document.hidden) state.hiddenAt = performance.now(); else if (state.hiddenAt) { const d = performance.now() - state.hiddenAt; state.roundStart += d; state.hiddenAt = 0; } }
  function start() {
    cancelAnimationFrame(frame); resize();
    state = {running:true, live:false, round:0, score:0, combo:0, bestCombo:0, hits:0, wrong:0, timeouts:0, clickMisses:0, times:[], targets:[], popups:[], rule:'pink', limit:2800, roundStart:0, locked:false, hiddenAt:0};
    overlay.classList.add('hidden'); resultBox.classList.add('hidden'); resultBox.innerHTML = '';
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(loop); setTimeout(() => { if (state && state.running) nextRound(); }, 600);
  }
  function readBest() { try { const v = JSON.parse(localStorage.getItem('rsa-targetlock-best') || 'null'); return v && Number.isFinite(v.score) ? v : null; } catch (e) { return null; } }
  window.renderTargetLockBest = function () {
    const b = readBest(), set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set('targetlock-best', b ? String(b.score) : '—'); set('profile-targetlock-best', b ? String(b.score) : '—');
    set('targetlock-detail', b ? 'Avg lock: ' + b.avg + ' ms • Hits: ' + b.hits + '/' + ROUNDS : 'Your best lock-on run');
  };
  function finish() {
    const s = state; if (!s || !s.running) return;
    s.running = false; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility);
    const avg = s.times.length ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) : null;
    const grade = s.score >= 2600 ? 'S' : s.score >= 1900 ? 'A' : s.score >= 1200 ? 'B' : s.score >= 600 ? 'C' : 'D';
    const flawless = s.hits === ROUNDS;
    const xp = 20 + Math.min(100, Math.floor(s.score / 28)) + (flawless ? 15 : 0);
    const unlocked = awardXP(xp, flawless ? ['target_lock'] : []);
    const prev = readBest(), record = !prev || s.score > prev.score;
    if (record) localStorage.setItem('rsa-targetlock-best', JSON.stringify({score:s.score, avg:avg === null ? 0 : avg, hits:s.hits, grade}));
    window.renderTargetLockBest();
    if (grade === 'S' || grade === 'A' || record) launchConfetti(grade === 'S' ? 200 : 110);
    if (grade === 'S') popText('🎯 S RANK!');
    playSound('finish');
    const level = playerLevel(), progress = playerProfile.xp % XP_PER_LEVEL;
    const ach = unlocked.length ? '<div class="new-achievements"><span>ACHIEVEMENT UNLOCKED</span>' + unlocked.map(i => '<div class="achievement-unlock"><b>' + i.icon + ' ' + i.name + '</b><small>' + i.description + '</small></div>').join('') + '</div>' : '<p class="no-achievement">Lock all ' + ROUNDS + ' targets in one run to unlock DEAD EYE.</p>';
    resultBox.innerHTML = '<div class="timing-grade grade-' + grade + '">' + grade + '</div><div class="reward-heading">RUN COMPLETE' + (record ? ' • NEW RECORD!' : '') + '</div><div class="reward-xp">+' + xp + ' XP <span>earned</span></div>' +
      '<div class="timing-stats"><div><b>' + s.score + '</b><span>SCORE</span></div><div><b>' + s.hits + ' / ' + ROUNDS + '</b><span>LOCKED</span></div><div><b>' + s.wrong + '</b><span>WRONG</span></div><div><b>' + s.bestCombo + '</b><span>BEST STREAK</span></div><div><b>' + (avg === null ? '—' : avg + ' ms') + '</b><span>AVG LOCK</span></div></div>' + ach +
      '<div class="reward-progress"><div><b>LEVEL ' + level + '</b><span>' + progress + ' / ' + XP_PER_LEVEL + ' XP TO NEXT LEVEL</span></div><div class="xp-track"><span style="width:' + (progress / XP_PER_LEVEL * 100) + '%"></span></div></div>';
    resultBox.classList.remove('hidden');
    overlayTitle.textContent = 'RANK ' + grade + ' • ' + s.score + ' POINTS';
    overlayText.textContent = record ? 'New personal record! Can you beat it?' : 'Try again to beat your best run.';
    startButton.textContent = 'PLAY AGAIN'; overlay.classList.remove('hidden');
    drawFrame(performance.now());
  }
  function stop() { if (state) { state.running = false; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibility); state = null; } }
  function open() {
    stop(); resultBox.classList.add('hidden'); resultBox.innerHTML = '';
    overlayTitle.textContent = 'TARGET LOCK';
    overlayText.textContent = 'Targets appear on screen. Each round tells you which color to lock onto (PINK or CYAN). Click only that target, as fast as you can. Wrong targets break your streak!';
    startButton.textContent = 'START'; overlay.classList.remove('hidden');
    showScreen(screen); resize(); cancelAnimationFrame(frame);
    const idle = now => { if (state || screen.classList.contains('hidden')) return; drawFrame(now); frame = requestAnimationFrame(idle); }; frame = requestAnimationFrame(idle);
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
  canvas.addEventListener('pointerdown', onDown);
  startButton.addEventListener('click', start);
  document.getElementById('targetlock-back-button').addEventListener('click', () => { stop(); cancelAnimationFrame(frame); showScreen(modeScreen); if (typeof renderStats === 'function') renderStats(); });
  document.getElementById('targetlock-mode-button').addEventListener('click', open);
  window.addEventListener('resize', () => { if (!screen.classList.contains('hidden')) resize(); });
  window.renderTargetLockBest();
})();
