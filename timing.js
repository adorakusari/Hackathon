/* PERFECT TIMING: press the matching key exactly when a glowing ring touches the target. */
(function () {
  'use strict';
  if (document.fonts) ['700 20px "Chakra Petch"','400 20px "Bungee"'].forEach(font => document.fonts.load(font));
  const screen = document.getElementById('timing-screen');
  const canvas = document.getElementById('timing-canvas');
  const overlay = document.getElementById('timing-overlay');
  const overlayTitle = document.getElementById('timing-overlay-title');
  const overlayText = document.getElementById('timing-overlay-text');
  const startButton = document.getElementById('timing-start-button');
  const resultBox = document.getElementById('timing-result');
  const keyButtons = Array.from(document.querySelectorAll('.timing-key'));
  if (!screen || !canvas) return;
  const ctx = canvas.getContext('2d');

  const LANES = [
    {key:'q', color:'#ff3b4e'},
    {key:'w', color:'#3d7bff'},
    {key:'e', color:'#19e6b0'},
    {key:'r', color:'#b455ff'},
    {key:'t', color:'#ffe533'}
  ];
  const TOTAL_RINGS = 20;
  const LEAD_IN = 3200;           // ms of "get ready" before the first ring appears
  const JUDGEMENTS = [
    {name:'PERFECT', ms:90, points:100, color:'#ffffff'},
    {name:'GREAT', ms:170, points:70, color:'#7dffb3'},
    {name:'GOOD', ms:260, points:40, color:'#ffe533'},
    {name:'OK', ms:380, points:15, color:'#ff9a4d'}
  ];
  const EARLY_LIMIT = 650;        // pressing this early (or late) costs the ring

  let state = null;
  let frame = 0;
  let width = 800, height = 450, dpr = 1;
  const triangles = Array.from({length:30}, () => ({
    x:Math.random(), y:Math.random(), size:12 + Math.random() * 54, rot:Math.random() * 6.28,
    spin:(Math.random() - .5) * .0004, vx:(Math.random() - .5) * .00002, vy:(Math.random() - .5) * .00002,
    alpha:.05 + Math.random() * .2, warm:Math.random() < .35, double:Math.random() < .5
  }));

  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(280, Math.round(rect.width || 800));
    height = Math.max(260, Math.min(Math.max(380, window.innerHeight - 340), 760, Math.round(width * (width < 520 ? .95 : .62))));
    canvas.style.height = height + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!state || !state.running) drawIdle();
  }

  function geometry() {
    const base = Math.min(height, width * .78);
    return {cx:width / 2, cy:height / 2 + 6, target:base * .2, start:base * .47, base};
  }

  /* ---------- drawing helpers ---------- */
  function glowRing(x, y, radius, color, lineWidth, blur, alpha) {
    if (radius <= 0.5) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawTriangle(x, y, size, rot, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rot + i * Math.PI * 2 / 3;
      const px = x + Math.cos(a) * size, py = y + Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.strokeStyle = stroke; ctx.stroke();
  }
  function drawBackground(time) {
    ctx.fillStyle = '#04010a'; ctx.fillRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) * .7);
    g.addColorStop(0, 'rgba(70,20,110,.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2;
    const still = reducedMotion();
    triangles.forEach(t => {
      if (!still) { t.x = (t.x + t.vx * 16 + 1) % 1; t.y = (t.y + t.vy * 16 + 1) % 1; t.rot += t.spin * 16; }
      const stroke = t.warm ? 'rgba(230,205,90,' + t.alpha + ')' : 'rgba(225,215,255,' + t.alpha + ')';
      drawTriangle(t.x * width, t.y * height, t.size, t.rot, stroke);
      if (t.double) drawTriangle(t.x * width, t.y * height, t.size * .62, t.rot, stroke);
    });
  }
  function nextColor() {
    if (!state || !state.running) return '#ffffff';
    const upcoming = state.rings.find(ring => !ring.done);
    return upcoming ? LANES[upcoming.lane].color : '#ffffff';
  }
  function drawArena(time, multiplier) {
    const geo = geometry();
    const cue = nextColor();
    const pulse = Math.sin(time / 320);
    glowRing(geo.cx, geo.cy, geo.start, cue, 6, 28, .95);
    glowRing(geo.cx, geo.cy, geo.start, '#ffffff', 1.6, 6, .8);
    const decor = [{f:.9, c:'#ffe533'}, {f:.72, c:'#b455ff'}, {f:.56, c:'#ffe533'}, {f:.42, c:'#b455ff'}, {f:.3, c:'#4fd8ff'}];
    decor.forEach((ring, index) => glowRing(geo.cx, geo.cy, geo.target * ring.f, ring.c, 2.2, 14, .32 + .14 * Math.sin(time / 380 + index)));
    const spin = time / 900 * (1 + multiplier * .5);
    ctx.save();
    ctx.translate(geo.cx, geo.cy); ctx.rotate(spin);
    ctx.strokeStyle = '#b455ff'; ctx.shadowColor = '#b455ff'; ctx.shadowBlur = 10; ctx.lineWidth = 1.4; ctx.globalAlpha = .85;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(geo.target * .26, 0); ctx.stroke(); }
    ctx.restore();
    glowRing(geo.cx, geo.cy, geo.target * .26, '#ffe533', 2, 12, .9);
    glowRing(geo.cx, geo.cy, geo.target * (1.0 + .02 * pulse), '#8a6bff', 12, 30, .4);
    glowRing(geo.cx, geo.cy, geo.target, '#ffffff', 5, 22, 1);
  }
  function drawBadge(x, y, radius, progress, color, big, small) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,10,24,.72)'; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    glowRing(x, y, radius, 'rgba(120,150,200,.35)', 4, 0, 1);
    if (progress > 0) {
      ctx.save();
      ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress)); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(radius * .62) + 'px "Chakra Petch", sans-serif'; ctx.fillText(big, x, y - (small ? radius * .12 : 0));
    if (small) { ctx.font = '700 ' + Math.round(radius * .25) + 'px "Chakra Petch", sans-serif'; ctx.globalAlpha = .8; ctx.fillText(small, x, y + radius * .46); }
    ctx.restore();
  }
  function drawHud(s) {
    const radius = width < 480 ? 29 : 38;
    const margin = radius + 14;
    const hits = s.counts.PERFECT + s.counts.GREAT + s.counts.GOOD + s.counts.OK;
    const avg = s.errors.length ? Math.round(s.errors.reduce((a, b) => a + b, 0) / s.errors.length) : null;
    drawBadge(margin, margin, radius, s.resolved ? hits / s.resolved : 0, '#19e6ff', avg === null ? '—' : String(avg), 'MS AVG');
    drawBadge(width - margin, margin, radius, s.multiplier >= 5 ? 1 : (s.combo % 4) / 4, s.multiplier >= 4 ? '#ffe533' : '#19e6ff', '×' + s.multiplier, s.combo ? s.combo + ' COMBO' : '');
    ctx.save();
    ctx.textAlign = 'center'; ctx.fillStyle = '#19e6ff'; ctx.shadowColor = '#19e6ff'; ctx.shadowBlur = 12;
    ctx.font = '700 ' + (width < 480 ? 13 : 17) + 'px "Chakra Petch", sans-serif';
    ctx.fillText('ROUND ' + Math.min(TOTAL_RINGS, s.resolved + 1) + ' / ' + TOTAL_RINGS, width / 2, 28);
    ctx.font = '700 ' + (width < 480 ? 26 : 36) + 'px "Chakra Petch", sans-serif';
    ctx.fillText(String(s.score), width / 2, 28 + (width < 480 ? 34 : 44));
    ctx.restore();
  }
  function drawIdle() {
    drawBackground(performance.now());
    drawArena(performance.now(), 1);
  }

  /* ---------- game loop ---------- */
  function virtualNow() { return performance.now() - state.startReal - state.pausedTotal; }
  function buildRings() {
    const rings = [];
    let spawn = LEAD_IN, last = -1, repeats = 0;
    for (let i = 0; i < TOTAL_RINGS; i++) {
      const progress = i / (TOTAL_RINGS - 1);
      const approach = 2800 - 700 * progress;
      let lane = Math.floor(Math.random() * LANES.length);
      while (lane === last && repeats >= 1) lane = Math.floor(Math.random() * LANES.length);
      repeats = lane === last ? repeats + 1 : 0; last = lane;
      rings.push({lane, spawn, approach, hit:spawn + approach, done:false});
      spawn += 2100 - 500 * progress;
    }
    return rings;
  }
  function resolveRing(ring, judgement, error) {
    ring.done = true; state.resolved++;
    const geo = geometry();
    if (judgement) {
      state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
      const previousMultiplier = state.multiplier;
      state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 4));
      const points = judgement.points * previousMultiplier;
      state.score += points;
      state.counts[judgement.name]++;
      state.errors.push(Math.abs(error));
      state.bursts.push({t0:virtualNow(), color:LANES[ring.lane].color, radius:geo.target});
      state.popups.push({t0:virtualNow(), text:judgement.name, sub:'+' + points + (judgement.name === 'PERFECT' ? '' : '  ' + (error < 0 ? 'EARLY ' : 'LATE ') + Math.round(Math.abs(error)) + 'ms'), color:judgement.color});
      playSound(judgement.name === 'PERFECT' || judgement.name === 'GREAT' ? 'combo' : judgement.name === 'GOOD' ? 'success' : 'click', Math.max(1, state.combo));
      if (state.multiplier > previousMultiplier) {
        popText('×' + state.multiplier + ' MULTIPLIER!');
        if (state.multiplier === 5) launchConfetti(90);
      }
    } else {
      const hadCombo = state.combo;
      state.combo = 0; state.multiplier = 1; state.counts.MISS++;
      state.popups.push({t0:virtualNow(), text:'MISS', sub:error === 'early' ? 'TOO EARLY' : 'TOO LATE', color:'#ff5a7a'});
      playSound('error');
      if (hadCombo >= 5) shakeScreen('sm');
    }
  }
  function strayPress() {
    if (!state.combo) return;
    state.combo = 0; state.multiplier = 1;
    state.popups.push({t0:virtualNow(), text:'NO RING', sub:'COMBO LOST', color:'#ff9a4d'});
    playSound('error');
  }
  function press(laneIndex, timeStamp) {
    if (!state || !state.running) return;
    const button = keyButtons[laneIndex];
    if (button) { button.classList.add('pressed'); setTimeout(() => button.classList.remove('pressed'), 110); }
    const t = (typeof timeStamp === 'number' ? timeStamp : performance.now()) - state.startReal - state.pausedTotal;
    let target = null;
    state.rings.forEach(ring => {
      if (ring.done || ring.lane !== laneIndex) return;
      if (Math.abs(t - ring.hit) <= EARLY_LIMIT && (!target || Math.abs(t - ring.hit) < Math.abs(t - target.hit))) target = ring;
    });
    if (!target) { if (t > state.rings[0].spawn - 300) strayPress(); return; }
    const error = t - target.hit;
    const judgement = JUDGEMENTS.find(entry => Math.abs(error) <= entry.ms);
    if (judgement) resolveRing(target, judgement, error);
    else resolveRing(target, null, error < 0 ? 'early' : 'late');
  }
  function drawFrame() {
    const s = state;
    const t = virtualNow();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(t);
    drawArena(t, s.multiplier);
    const geo = geometry();
    // moving rings
    s.rings.forEach(ring => {
      if (ring.done && ring.fade === undefined) return;
      const u = (t - ring.spawn) / ring.approach;
      if (u < 0) return;
      const radius = geo.start + (geo.target - geo.start) * u;
      if (radius <= 3) return;
      const color = LANES[ring.lane].color;
      const fadeIn = Math.min(1, u * 6);
      glowRing(geo.cx, geo.cy, radius, color, 7, 30, fadeIn);
      glowRing(geo.cx, geo.cy, radius, '#ffffff', 2, 8, fadeIn * .85);
    });
    // bursts and popups
    s.bursts = s.bursts.filter(b => t - b.t0 < 520);
    s.bursts.forEach(b => { const p = (t - b.t0) / 520; glowRing(geo.cx, geo.cy, b.radius * (1 + p * .7), b.color, 7 * (1 - p) + 1, 30, 1 - p); });
    s.popups = s.popups.filter(p => t - p.t0 < 950);
    s.popups.forEach(p => {
      const progress = (t - p.t0) / 950;
      ctx.save();
      ctx.globalAlpha = 1 - progress * progress; ctx.textAlign = 'center'; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16;
      ctx.font = '400 ' + (width < 480 ? 18 : 26) + 'px \"Bungee\", sans-serif';
      ctx.fillText(p.text, geo.cx, geo.cy + geo.target + 38 - progress * 30);
      ctx.font = '700 ' + (width < 480 ? 11 : 14) + 'px "Chakra Petch", sans-serif'; ctx.fillText(p.sub, geo.cx, geo.cy + geo.target + 60 - progress * 30);
      ctx.restore();
    });
    drawHud(s);
    // get-ready countdown
    if (t < LEAD_IN - 150) {
      const number = Math.max(1, Math.ceil((LEAD_IN - 150 - t) / 1000));
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#19e6ff'; ctx.shadowBlur = 24;
      ctx.font = '400 ' + Math.round(geo.target * .9) + 'px \"Bungee\", sans-serif'; ctx.fillText(String(number), geo.cx, geo.cy);
      ctx.font = '700 ' + (width < 480 ? 13 : 16) + 'px "Chakra Petch", sans-serif'; ctx.fillText('GET READY', geo.cx, geo.cy - geo.target * 1.35);
      ctx.restore();
    }
  }
  function loop() {
    if (!state || !state.running) return;
    if (!document.hidden) {
      const t = virtualNow();
      state.rings.forEach(ring => { if (!ring.done && t > ring.hit + JUDGEMENTS[JUDGEMENTS.length - 1].ms) resolveRing(ring, null, 'late'); });
      drawFrame();
      if (state.resolved >= TOTAL_RINGS && !state.finishing) { state.finishing = true; setTimeout(finish, 900); }
    }
    frame = requestAnimationFrame(loop);
  }

  /* ---------- start / finish / leave ---------- */
  function onKeyDown(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const lane = LANES.findIndex(entry => entry.key === event.key.toLowerCase());
    if (lane < 0) return;
    event.preventDefault();
    press(lane, event.timeStamp);
  }
  function onVisibility() {
    if (!state || !state.running) return;
    if (document.hidden) state.pauseStart = performance.now();
    else if (state.pauseStart) { state.pausedTotal += performance.now() - state.pauseStart; state.pauseStart = 0; }
  }
  function startRun() {
    cancelAnimationFrame(frame);
    resizeCanvas();
    state = {rings:buildRings(), startReal:performance.now(), pausedTotal:0, pauseStart:0, running:true, finishing:false, score:0, combo:0, bestCombo:0, multiplier:1, resolved:0, errors:[], bursts:[], popups:[], counts:{PERFECT:0, GREAT:0, GOOD:0, OK:0, MISS:0}};
    overlay.classList.add('hidden');
    resultBox.classList.add('hidden'); resultBox.innerHTML = '';
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(loop);
  }
  function stopListening() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
  }
  function readBest() {
    try { const saved = JSON.parse(localStorage.getItem('rsa-timing-best') || 'null'); return saved && Number.isFinite(saved.score) ? saved : null; } catch (error) { return null; }
  }
  window.renderTimingBest = function () {
    const best = readBest();
    const main = document.getElementById('timing-best');
    const detail = document.getElementById('timing-detail');
    const profile = document.getElementById('profile-timing-best');
    if (main) main.textContent = best ? String(best.score) : '—';
    if (detail) detail.textContent = best ? 'Perfect hits: ' + best.perfects + ' • Best combo: ' + best.combo : 'Your best precision run';
    if (profile) profile.textContent = best ? String(best.score) : '—';
  };
  function finish() {
    if (!state) return;
    const s = state;
    s.running = false;
    cancelAnimationFrame(frame);
    stopListening();
    const hits = s.counts.PERFECT + s.counts.GREAT + s.counts.GOOD + s.counts.OK;
    const avg = s.errors.length ? Math.round(s.errors.reduce((a, b) => a + b, 0) / s.errors.length) : null;
    const grade = s.score >= 3800 ? 'S' : s.score >= 2600 ? 'A' : s.score >= 1500 ? 'B' : s.score >= 600 ? 'C' : 'D';
    const xp = 20 + Math.min(100, Math.floor(s.score / 70)) + (s.counts.PERFECT >= 6 ? 10 : 0);
    const unlocked = awardXP(xp, s.counts.PERFECT >= 6 ? ['perfect_timing'] : []);
    const previous = readBest();
    const isRecord = !previous || s.score > previous.score;
    if (isRecord) localStorage.setItem('rsa-timing-best', JSON.stringify({score:s.score, perfects:s.counts.PERFECT, combo:s.bestCombo, grade}));
    window.renderTimingBest();
    if (grade === 'S' || grade === 'A' || isRecord) { launchConfetti(grade === 'S' ? 200 : 120); }
    if (grade === 'S') popText('🎯 S RANK!');
    playSound('finish');
    drawFrameOnce();
    const level = playerLevel();
    const progress = playerProfile.xp % XP_PER_LEVEL;
    const achievementHtml = unlocked.length
      ? '<div class="new-achievements"><span>ACHIEVEMENT UNLOCKED</span>' + unlocked.map(item => '<div class="achievement-unlock"><b>' + item.icon + ' ' + item.name + '</b><small>' + item.description + '</small></div>').join('') + '</div>'
      : '<p class="no-achievement">Land 6 PERFECT hits in one run to unlock SHARPSHOOTER.</p>';
    resultBox.innerHTML =
      '<div class="timing-grade grade-' + grade + '">' + grade + '</div>' +
      '<div class="reward-heading">RUN COMPLETE' + (isRecord ? ' • NEW RECORD!' : '') + '</div>' +
      '<div class="reward-xp">+' + xp + ' XP <span>earned</span></div>' +
      '<div class="timing-stats">' +
        '<div><b>' + s.score + '</b><span>SCORE</span></div>' +
        '<div><b>' + s.counts.PERFECT + '</b><span>PERFECT</span></div>' +
        '<div><b>' + hits + ' / ' + TOTAL_RINGS + '</b><span>HITS</span></div>' +
        '<div><b>' + s.bestCombo + '</b><span>BEST COMBO</span></div>' +
        '<div><b>' + (avg === null ? '—' : avg + ' ms') + '</b><span>AVG ERROR</span></div>' +
      '</div>' + achievementHtml +
      '<div class="reward-progress"><div><b>LEVEL ' + level + '</b><span>' + progress + ' / ' + XP_PER_LEVEL + ' XP TO NEXT LEVEL</span></div><div class="xp-track"><span style="width:' + (progress / XP_PER_LEVEL * 100) + '%"></span></div></div>';
    resultBox.classList.remove('hidden');
    overlayTitle.textContent = 'RANK ' + grade + ' • ' + s.score + ' POINTS';
    overlayText.textContent = isRecord ? 'New personal record! Can you beat it?' : 'Try again to beat your best run.';
    startButton.textContent = 'PLAY AGAIN';
    startButton.style.display = mysteryActive ? 'none' : '';
    overlay.classList.remove('hidden');
    mysteryMiniGameDone(resultBox);
  }
  function drawFrameOnce() { try { drawFrame(); } catch (error) { /* final frame is optional */ } }
  function leave() {
    if (state) { state.running = false; cancelAnimationFrame(frame); stopListening(); state = null; }
    mysteryActive = false;
    showScreen(modeScreen);
    if (typeof renderStats === 'function') renderStats();
  }
  function open() {
    if (state) { state.running = false; cancelAnimationFrame(frame); stopListening(); state = null; }
    resultBox.classList.add('hidden'); resultBox.innerHTML = '';
    overlayTitle.textContent = 'PERFECT TIMING';
    overlayText.textContent = 'Press the matching key (Q W E R T) the instant a glowing ring touches the white target. The closer you are, the more points you score. Keep a combo going to raise your multiplier up to ×5!';
    startButton.textContent = 'START';
    startButton.style.display = '';
    screen.querySelector('.eyebrow').textContent = 'PRECISION CHALLENGE';
    overlay.classList.remove('hidden');
    showScreen(screen);
    resizeCanvas();
    drawIdle();
  }

  keyButtons.forEach((button, index) => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); press(index, event.timeStamp); });
    button.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') event.preventDefault(); });
  });
  window.openTimingMode = function (label) { open(); screen.querySelector('.eyebrow').textContent = label; };
  startButton.addEventListener('click', startRun);
  document.getElementById('timing-back-button').addEventListener('click', leave);
  document.getElementById('timing-mode-button').addEventListener('click', open);
  window.addEventListener('resize', () => { if (!screen.classList.contains('hidden')) resizeCanvas(); });
  window.renderTimingBest();
})();
