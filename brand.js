/* Reaction Speed Arena — brand layer: logo, signature start-up sound, 3-2-1-GO countdown. */
(function () {
  'use strict';

  /* ---------- logo: a chamfered tile, a shrinking timing ring and a lightning bolt cutting through it ---------- */
  function logoMark(size, id) {
    return '<svg class="rsa-mark" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-label="Reaction Speed Arena logo">' +
      '<path d="M0 0 H50 L64 14 V64 H14 L0 50Z" fill="#ffd23f"/>' +
      '<path d="M0 0 H50 L64 14 V64 H14 L0 50Z" fill="none" stroke="#0a0c12" stroke-width="2"/>' +
      '<g fill="none" stroke="#0a0c12" stroke-width="3"><circle class="rsa-ring" cx="32" cy="33" r="19" stroke-dasharray="104 16" transform="rotate(-70)"/></g>' +
      '<g stroke="#0a0c12" stroke-width="3" stroke-linecap="square"><path d="M32 6V11M32 55V60M5 33H10M54 33H59"/></g>' +
      '<path class="rsa-bolt" d="M37 14 L21 37 H30 L26 53 L44 29 H34 Z" fill="#0a0c12"/>' +
      '<path d="M36 19 L26 34 H32 L30 44" fill="none" stroke="#ffd23f" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>' +
      '</svg>';
  }
  window.rsaLogoMark = logoMark;

  const hero = document.querySelector('.hero-main');
  if (hero && !document.querySelector('.hero-logo')) {
    const lock = document.createElement('div');
    lock.className = 'hero-logo';
    lock.innerHTML = logoMark(112);
    hero.insertBefore(lock, hero.firstChild);
  }
  const tabs = document.getElementById('arena-tabs');
  if (tabs && !tabs.querySelector('.tabs-logo')) {
    const b = document.createElement('div');
    b.className = 'tabs-logo'; b.innerHTML = logoMark(30) + '<span>REACTION SPEED <em>ARENA</em></span>';
    tabs.insertBefore(b, tabs.firstChild);
  }
  const fav = document.createElement('link');
  fav.rel = 'icon'; fav.type = 'image/svg+xml';
  fav.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M0 0H50L64 14V64H14L0 50Z" fill="#ffd23f"/><path d="M37 14L21 37H30L26 53L44 29H34Z" fill="#0a0c12"/></svg>');
  document.head.appendChild(fav);

  /* ---------- sound ---------- */
  function ctx() {
    if (typeof soundMuted !== 'undefined' && soundMuted) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      soundContext = soundContext || new AC();
      if (soundContext.state === 'suspended') soundContext.resume();
      return soundContext;
    } catch (e) { return null; }
  }
  function tone(c, hz, at, dur, type, vol, toHz) {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(hz, t);
    if (toHz) o.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function zap(c, at, dur, vol) {
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
    f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(5200, t + dur); f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  /* The Arena sting: charge-up sweep, three stacked rising notes (a minor 3rd then a 5th), a bright bolt zap on the hit. */
  function arenaSting() {
    const c = ctx(); if (!c) return;
    tone(c, 70, 0, .42, 'sawtooth', .05, 280);
    tone(c, 330, .22, .12, 'square', .045); tone(c, 392, .3, .12, 'square', .045); tone(c, 587, .38, .14, 'square', .045);
    zap(c, .5, .22, .09);
    tone(c, 784, .52, .5, 'triangle', .09); tone(c, 1175, .52, .5, 'sine', .06); tone(c, 392, .52, .55, 'sawtooth', .035);
  }
  window.arenaSting = arenaSting;
  const playBtn = document.getElementById('levels-button');
  if (playBtn) playBtn.addEventListener('click', arenaSting);
  const mark = document.querySelector('.hero-logo');
  if (mark) { mark.style.cursor = 'pointer'; mark.addEventListener('click', arenaSting); }

  /* ---------- countdown ---------- */
  const STEPS = [
    {t:'3', c:'#ff4f81', hz:392}, {t:'2', c:'#ff9f45', hz:494}, {t:'1', c:'#22d3e6', hz:622}, {t:'GO!', c:'#ffd23f', hz:0}
  ];
  let running = false;
  window.arenaCountdown = function (done) {
    if (running) return; running = true;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const beat = reduce ? 450 : 720;
    const ov = document.createElement('div');
    ov.className = 'cd-overlay'; ov.setAttribute('aria-live', 'assertive');
    ov.innerHTML = '<div class="cd-bars"><i></i><i></i><i></i><i></i><i></i></div><div class="cd-stage"><svg class="cd-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="86"/></svg><div class="cd-num" id="cd-num"></div><div class="cd-burst"></div></div><div class="cd-label">GET READY</div>';
    document.body.appendChild(ov);
    const num = ov.querySelector('#cd-num'), stage = ov.querySelector('.cd-stage'), label = ov.querySelector('.cd-label');
    ov.style.setProperty('--beat', beat + 'ms');
    function show(i) {
      const s = STEPS[i]; const go = i === 3;
      stage.classList.remove('beat', 'go'); void stage.offsetWidth;
      stage.style.setProperty('--cd', s.c); ov.style.setProperty('--cd', s.c);
      num.textContent = s.t; stage.classList.add(go ? 'go' : 'beat');
      label.textContent = go ? 'REACT!' : 'GET READY';
      const c = ctx();
      if (c) {
        if (!go) { tone(c, s.hz, 0, .16, 'square', .06); tone(c, s.hz / 2, 0, .2, 'triangle', .07); }
        else { zap(c, 0, .18, .08); tone(c, 659, 0, .35, 'square', .05); tone(c, 988, .02, .4, 'triangle', .08); tone(c, 1319, .04, .5, 'sine', .07); tone(c, 494, 0, .4, 'sawtooth', .03); }
      }
    }
    let i = 0; show(0);
    const timer = setInterval(() => {
      i++;
      if (i <= 3) show(i);
      if (i === 3) {
        clearInterval(timer);
        setTimeout(() => { running = false; try { done(); } catch (e) { console.error(e); } }, 260);
        setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.remove(), 320); }, 640);
      }
    }, beat);
  };

  const CAPTURE = [
    ['reaction-button', b => /^(START ROUND|START CLICK TEST|TRY AGAIN|PLAY AGAIN)/.test(b.textContent.trim()) && !b.disabled],
    ['timing-start-button', b => !b.disabled],
    ['targetlock-start-button', b => !b.disabled],
    ['race-start-button', b => !b.disabled]
  ];
  CAPTURE.forEach(pair => {
    const b = document.getElementById(pair[0]); if (!b) return;
    let bypass = false;
    b.addEventListener('click', e => {
      if (bypass) { bypass = false; return; }
      if (!pair[1](b)) return;
      e.stopImmediatePropagation(); e.preventDefault();
      window.arenaCountdown(() => { bypass = true; b.click(); });
    }, true);
  });
})();
