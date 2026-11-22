/* Arena UI: tabbed mode screen (Play / Daily Rewards) and first-time "How to play" tutorials. */
(function () {
  'use strict';
  /* ---------- tabs + notification dot ---------- */
  const tabs = Array.from(document.querySelectorAll('.arena-tab'));
  const panes = {play:document.getElementById('pane-play'), daily:document.getElementById('pane-daily')};
  function showPane(name) {
    tabs.forEach(tab => { const on = tab.dataset.pane === name; tab.classList.toggle('active', on); tab.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    Object.keys(panes).forEach(key => panes[key].classList.toggle('hidden', key !== name));
  }
  tabs.forEach(tab => tab.addEventListener('click', () => { showPane(tab.dataset.pane); playSound('click'); }));
  function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function refreshDot() {
    const dot = document.getElementById('daily-dot'); if (!dot) return;
    let spinReady = false; try { spinReady = localStorage.getItem('rsa-spin-last') !== todayKey(); } catch (e) { }
    const card = document.getElementById('streak-card');
    const streakReady = !!(card && card.classList.contains('streak-ready'));
    dot.classList.toggle('hidden', !(spinReady || streakReady));
  }
  refreshDot(); setInterval(refreshDot, 1500);

  /* ---------- tutorials ---------- */
  const TUTORIALS = {
    'color-mode-button':{key:'color', title:'COLOR REACTION', demo:'color', steps:['Press START ROUND and wait. The screen stays dark.', 'The moment it flashes the target color, click as fast as you can.', 'Clicking too early fails the round. Faster reactions unlock higher levels.']},
    'html-mode-button':{key:'html', title:'HTML SPEED', demo:'html', steps:['A tag description appears on screen.', 'Type or pick the matching HTML tag before the clock runs out.', 'Finish levels quickly and without mistakes to climb the ranks.']},
    'click-mode-button':{key:'click', title:'CLICK SPEED', demo:'click', steps:['Choose how long you want to play: 30 seconds up to 2 minutes.', 'Click the glowing target as many times as you can.', 'Your clicks per second becomes your record to beat.']},
    'code-mode-button':{key:'code', title:'CODE RACE', demo:'race', steps:['Pick a language and press start.', 'Type the code snippet exactly as shown. Mistakes slow you down.', 'Outrun the rival drivers to the finish line to win.']},
    'timing-mode-button':{key:'timing', title:'PERFECT TIMING', demo:'timing', steps:['Rings shrink toward the white target. The big outer ring shows which key is next.', 'Press that key (Q W E R T) the instant the ring touches the target.', 'The closer you are, the more points. Chain hits for a ×5 multiplier.']},
    'targetlock-mode-button':{key:'target', title:'TARGET LOCK', demo:'target', steps:['Every round tells you a color to lock onto: PINK or CYAN.', 'Many targets appear. Click only the one with the right color.', 'Wrong clicks break your streak. Fast, clean locks score the most.']},
    'mystery-mode-button':{key:'mystery', title:'MYSTERY MODE', demo:'mystery', steps:['You get five surprise rounds in a row.', 'Each round is a random game mode you have never been warned about.', 'Finish all five to claim a bonus of 75 XP.']}
  };
  const DEMOS = {
    color:'<div class="demo demo-color"><b>WAIT…</b></div>',
    html:'<div class="demo demo-html"><code>&lt;button&gt;</code><span class="caret"></span></div>',
    click:'<div class="demo demo-click"><i class="pulse"></i><span class="cursor">☝</span></div>',
    race:'<div class="demo demo-race"><i style="--s:3.2s"></i><i style="--s:4s"></i><i style="--s:2.6s"></i><i style="--s:3.6s"></i></div>',
    timing:'<div class="demo demo-timing"><i class="ring r-out"></i><i class="ring r-move"></i><i class="ring r-target"></i></div>',
    target:'<div class="demo demo-target"><i class="t t1"></i><i class="t t2"></i><i class="t t3 pink"></i><i class="t t4"></i><span class="xhair"></span></div>',
    mystery:'<div class="demo demo-mystery"><span>?</span></div>'
  };
  const modal = document.createElement('div');
  modal.className = 'auth-modal tut-modal hidden'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = '<div class="auth-card tut-card"><span class="tut-kicker">HOW TO PLAY</span><h3 class="tut-title" id="tut-title"></h3><div class="tut-demo" id="tut-demo"></div><ol class="tut-steps" id="tut-steps"></ol><div class="tut-actions"><button class="tut-skip" id="tut-skip" type="button">SKIP</button><button class="start-button tut-go" id="tut-go" type="button">GOT IT, LET\'S GO</button></div></div>';
  document.body.appendChild(modal);
  let pending = null;
  function seen(key) { try { return localStorage.getItem('rsa-tut-' + key) === '1'; } catch (e) { return true; } }
  function close(launch) {
    modal.classList.add('hidden');
    if (pending) { try { localStorage.setItem('rsa-tut-' + pending.info.key, '1'); } catch (e) { } const p = pending; pending = null; if (launch) p.button.click(); }
  }
  document.getElementById('tut-go').addEventListener('click', () => close(true));
  document.getElementById('tut-skip').addEventListener('click', () => close(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(false); });
  Object.keys(TUTORIALS).forEach(id => {
    const button = document.getElementById(id); if (!button) return;
    button.addEventListener('click', event => {
      const info = TUTORIALS[id]; if (seen(info.key)) return;
      event.stopImmediatePropagation(); event.preventDefault();
      pending = {button, info};
      document.getElementById('tut-title').textContent = info.title;
      document.getElementById('tut-demo').innerHTML = DEMOS[info.demo];
      document.getElementById('tut-steps').innerHTML = info.steps.map((s, i) => '<li><b>' + (i + 1) + '</b><span>' + s + '</span></li>').join('');
      modal.classList.remove('hidden'); document.getElementById('tut-go').focus();
    }, true);
  });
})();
