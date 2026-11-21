const TOTAL_LEVELS = 10;
const colorThresholds = [800,700,600,550,500,450,400,350,300,250];
const htmlThresholds = [12000,11000,10000,9000,8000,7000,6000,5000,4500,4000];
const htmlQuestions = [
  { prompt:'Which HTML tag creates a paragraph?', answer:'<p>', choices:['<div>','<h1>','<p>','<span>'] },
  { prompt:'Which tag creates the main, largest heading?', answer:'<h1>', choices:['<h1>','<h2>','<title>','<strong>'] },
  { prompt:'Which tag creates a clickable link?', answer:'<a>', choices:['<link>','<a>','<href>','<nav>'] },
  { prompt:'Which tag displays an image?', answer:'<img>', choices:['<image>','<src>','<picture>','<img>'] },
  { prompt:'Which tag inserts a line break?', answer:'<br>', choices:['<hr>','<break>','<br>','<p>'] },
  { prompt:'Which tag creates an unordered (bulleted) list?', answer:'<ul>', choices:['<ol>','<li>','<ul>','<list>'] },
  { prompt:'Which tag defines one item inside a list?', answer:'<li>', choices:['<li>','<ul>','<ol>','<item>'] },
  { prompt:'Which tag creates a clickable button?', answer:'<button>', choices:['<input>','<click>','<btn>','<button>'] },
  { prompt:'Which tag creates an input field for user data?', answer:'<input>', choices:['<form>','<input>','<textarea>','<label>'] },
  { prompt:'Which tag is the root element of an HTML page?', answer:'<html>', choices:['<head>','<body>','<main>','<html>'] }
];

const homeScreen = document.getElementById('home-screen');
const modeScreen = document.getElementById('mode-screen');
const levelsScreen = document.getElementById('levels-screen');
const gameScreen = document.getElementById('game-screen');
const levelGrid = document.getElementById('level-grid');
const progressLabel = document.getElementById('progress-label');
const reactionBox = document.getElementById('reaction-box');
const reactionMessage = document.getElementById('reaction-message');
const reactionButton = document.getElementById('reaction-button');
const htmlOptions = document.getElementById('html-options');
const resultMessage = document.getElementById('result-message');
const targetLabel = document.getElementById('target-label');
const instructions = document.getElementById('game-instructions');
let activeMode = 'color';
let activeLevel = 1;
let colorUnlocked = Math.min(TOTAL_LEVELS, Math.max(1, Number(localStorage.getItem('rsa-unlocked-level')) || 1));
let htmlUnlocked = Math.min(TOTAL_LEVELS, Math.max(1, Number(localStorage.getItem('rsa-html-unlocked-level')) || 1));
let startTime = 0;
let timeoutId = null;
let roundState = 'idle';
let clickInterval = null;
let clickCount = 0;
let clickDuration = 60;
let clickEndsAt = 0;
let clickBestCps = Number(localStorage.getItem('rsa-click-best-cps')) || 0;
const comboStreaks = { color:0, html:0 };
function updateCombo(message) {
  const label = document.getElementById('combo-label');
  if (!label) return;
  const streak = comboStreaks[activeMode];
  label.textContent = message || (streak >= 2 ? '🔥 ' + streak + 'x COMBO!' : streak === 1 ? '1 CORRECT IN A ROW' : 'COMBO: 0');
  label.classList.toggle('combo-active', streak >= 2);
}
function registerComboResult(passed) {
  if (passed) comboStreaks[activeMode]++;
  else comboStreaks[activeMode] = 0;
  updateCombo(!passed ? 'COMBO RESET — TRY AGAIN!' : comboStreaks[activeMode] >= 2 ? '🔥 ' + comboStreaks[activeMode] + 'x COMBO!' : 'NICE! KEEP GOING!');
}
const emptyStats = () => ({ attempts:0, correct:0, bestMs:null });
function readStats(mode) {
  try {
    const saved = JSON.parse(localStorage.getItem('rsa-stats-' + mode));
    if (saved && Number.isFinite(saved.attempts) && Number.isFinite(saved.correct)) {
      return { attempts:saved.attempts, correct:saved.correct, bestMs:Number.isFinite(saved.bestMs) ? saved.bestMs : null };
    }
  } catch (error) { /* Start with clean stats if saved data is invalid. */ }
  return emptyStats();
}
const stats = { color:readStats('color'), html:readStats('html') };
function recordAttempt(mode, isCorrect, timeMs) {
  const record = stats[mode];
  record.attempts++;
  if (isCorrect) {
    record.correct++;
    if (record.bestMs === null || timeMs < record.bestMs) record.bestMs = timeMs;
  }
  localStorage.setItem('rsa-stats-' + mode, JSON.stringify(record));
  renderStats();
}
function renderStats() {
  const clickBest = document.getElementById('click-best');
  if (clickBest) clickBest.textContent = clickBestCps ? clickBestCps.toFixed(2) : '—';
  ['color','html'].forEach(mode => {
    const record = stats[mode];
    const best = document.getElementById(mode + '-best');
    const accuracy = document.getElementById(mode + '-accuracy');
    if (!best || !accuracy) return;
    best.textContent = record.bestMs === null ? '—' : record.bestMs + ' MS';
    const percent = record.attempts ? Math.round(record.correct / record.attempts * 100) : 0;
    accuracy.textContent = 'Accuracy: ' + percent + '% (' + record.correct + '/' + record.attempts + ')';
  });
}

function getUnlocked() { return activeMode === 'color' ? colorUnlocked : htmlUnlocked; }
function getThreshold() { return (activeMode === 'color' ? colorThresholds : htmlThresholds)[activeLevel - 1]; }
function saveProgress() {
  if (activeMode === 'color') localStorage.setItem('rsa-unlocked-level', String(colorUnlocked));
  else localStorage.setItem('rsa-html-unlocked-level', String(htmlUnlocked));
}
function showScreen(screen) {
  [homeScreen,modeScreen,levelsScreen,gameScreen].forEach(item => item.classList.add('hidden'));
  screen.classList.remove('hidden');
}
function removeNextButton() {
  const oldNext = document.getElementById('next-level-button');
  if (oldNext) oldNext.remove();
}
function renderLevels() {
  levelGrid.innerHTML = '';
  const unlockedLevel = getUnlocked();
  levelsScreen.classList.toggle('html-levels', activeMode === 'html');
  document.getElementById('levels-eyebrow').textContent = activeMode === 'color' ? 'COLOR REACTION' : 'HTML SPEED CHALLENGE';
  document.getElementById('levels-title').textContent = activeMode === 'color' ? 'COLOR LEVELS' : 'HTML LEVELS';
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const unlocked = level <= unlockedLevel;
    const completed = level < unlockedLevel;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-button' + (unlocked ? ' unlocked' : '') + (completed ? ' completed' : '');
    button.disabled = !unlocked;
    button.innerHTML = '<span class="level-number">' + String(level).padStart(2,'0') + '</span><span class="level-status">' +
      (completed ? '✓ COMPLETE' : unlocked ? 'UNLOCKED' : '🔒 LOCKED') + '</span>';
    if (unlocked) button.addEventListener('click', () => openLevel(level));
    levelGrid.appendChild(button);
  }
  progressLabel.textContent = 'LEVEL ' + unlockedLevel + ' OF ' + TOTAL_LEVELS + ' UNLOCKED';
}
function openMode(mode) {
  activeMode = mode;
  renderLevels();
  showScreen(levelsScreen);
}
function openClickMode() {
  activeMode = 'click';
  clearInterval(clickInterval);
  roundState = 'idle';
  removeNextButton();
  htmlOptions.classList.add('hidden');
  htmlOptions.innerHTML = '';
  document.getElementById('click-settings').classList.remove('hidden');
  reactionButton.classList.remove('hidden');
  reactionButton.disabled = false;
  reactionButton.textContent = 'START CLICK TEST';
  document.getElementById('active-level-label').textContent = 'CLICK SPEED TEST';
  document.getElementById('game-title-active').textContent = 'HOW FAST CAN YOU CLICK?';
  instructions.textContent = 'Choose a duration, then click inside the arena as many times as possible before time runs out.';
  reactionBox.className = 'reaction-box click-arena';
  reactionMessage.textContent = 'READY?';
  resultMessage.textContent = '';
  targetLabel.textContent = 'YOUR BEST: ' + (clickBestCps ? clickBestCps.toFixed(2) + ' CLICKS / SEC' : 'NO RECORD YET');
  document.getElementById('combo-label').classList.add('hidden');
  showScreen(gameScreen);
}
function startClickTest() {
  clearInterval(clickInterval);
  clickDuration = Number(document.getElementById('click-duration').value) || 60;
  clickCount = 0;
  clickEndsAt = Date.now() + clickDuration * 1000;
  roundState = 'clicking';
  reactionButton.disabled = true;
  reactionButton.textContent = 'TEST IN PROGRESS';
  reactionMessage.textContent = '0 CLICKS';
  reactionBox.classList.add('click-active');
  resultMessage.textContent = 'CLICK AS FAST AS YOU CAN!';
  targetLabel.textContent = 'TIME LEFT: ' + clickDuration + ' SECONDS';
  clickInterval = setInterval(() => {
    const remaining = Math.max(0, (clickEndsAt - Date.now()) / 1000);
    targetLabel.textContent = 'TIME LEFT: ' + remaining.toFixed(1) + ' SECONDS';
    if (remaining <= 0) finishClickTest();
  }, 50);
}
function finishClickTest() {
  clearInterval(clickInterval);
  clickInterval = null;
  roundState = 'finished';
  reactionBox.classList.remove('click-active');
  const cps = clickCount / clickDuration;
  reactionMessage.textContent = clickCount + ' CLICKS!';
  reactionButton.disabled = false;
  reactionButton.textContent = 'TRY AGAIN';
  resultMessage.textContent = 'Your speed: ' + cps.toFixed(2) + ' clicks per second. ' + (cps > clickBestCps ? 'NEW PERSONAL RECORD!' : 'Keep practicing to beat your record!');
  if (cps > clickBestCps) {
    clickBestCps = cps;
    localStorage.setItem('rsa-click-best-cps', String(clickBestCps));
  }
  targetLabel.textContent = 'BEST: ' + clickBestCps.toFixed(2) + ' CLICKS / SEC';
  renderStats();
}
function openLevel(level) {
  activeLevel = level;
  document.getElementById('click-settings').classList.add('hidden');
  document.getElementById('combo-label').classList.remove('hidden');
  clearTimeout(timeoutId);
  clearInterval(clickInterval);
  removeNextButton();
  const oldRetry = document.getElementById('html-retry-button');
  if (oldRetry) oldRetry.remove();
  roundState = 'idle';
  reactionBox.className = 'reaction-box';
  htmlOptions.classList.add('hidden');
  htmlOptions.innerHTML = '';
  reactionButton.classList.toggle('hidden', activeMode === 'html');
  document.getElementById('active-level-label').textContent = (activeMode === 'color' ? 'COLOR REACTION' : 'HTML SPEED') + ' • LEVEL ' + level;
  document.getElementById('game-title-active').textContent = activeMode === 'color' ? 'Ready to react?' : 'HTML QUICKFIRE';
  resultMessage.textContent = '';
  updateCombo();
  if (activeMode === 'color') {
    instructions.textContent = 'Press START ROUND. Wait for the box to turn green, then click as quickly as possible.';
    reactionMessage.textContent = 'GET READY';
    reactionButton.textContent = 'START ROUND';
    reactionButton.disabled = false;
    targetLabel.textContent = 'TARGET: UNDER ' + colorThresholds[level - 1] + ' MS';
  } else {
    const question = htmlQuestions[level - 1];
    instructions.textContent = 'Choose the correct HTML tag as quickly as you can. Your time starts now!';
    reactionMessage.textContent = question.prompt;
    htmlOptions.classList.remove('hidden');
    question.choices.forEach(choice => {
      const answer = document.createElement('button');
      answer.type = 'button';
      answer.className = 'answer-button';
      answer.textContent = choice;
      answer.addEventListener('click', () => finishHtmlRound(choice));
      htmlOptions.appendChild(answer);
    });
    startTime = performance.now();
    targetLabel.textContent = 'TIME LIMIT: ' + (htmlThresholds[level - 1] / 1000).toFixed(1) + ' SECONDS';
  }
  showScreen(gameScreen);
}
function completeLevel(reaction) {
  let unlocked = getUnlocked();
  if (activeLevel === unlocked && unlocked < TOTAL_LEVELS) {
    unlocked++;
    if (activeMode === 'color') colorUnlocked = unlocked;
    else htmlUnlocked = unlocked;
    saveProgress();
  }
  resultMessage.textContent = activeLevel === TOTAL_LEVELS
    ? 'INCREDIBLE! YOU COMPLETED THIS GAME MODE!'
    : 'Amazing! You passed Level ' + activeLevel + ' in ' + reaction + ' ms!';
  if (activeMode === 'color') reactionButton.textContent = 'PLAY AGAIN';
  if (activeLevel === TOTAL_LEVELS) resultMessage.textContent = 'INCREDIBLE! YOU COMPLETED THIS GAME MODE!';
  const next = document.createElement('button');
  next.type = 'button';
  next.id = 'next-level-button';
  next.className = 'start-button game-action next-level-button';
  next.style.marginTop = '12px';
  next.textContent = activeLevel === TOTAL_LEVELS ? 'BACK TO LEVELS' : 'NEXT LEVEL';
  next.addEventListener('click', () => {
    if (activeLevel < TOTAL_LEVELS) openLevel(activeLevel + 1);
    else { renderLevels(); showScreen(levelsScreen); }
  });
  reactionButton.insertAdjacentElement('afterend', next);
}
function beginRound() {
  removeNextButton();
  roundState = 'waiting';
  reactionBox.className = 'reaction-box waiting';
  reactionMessage.textContent = 'WAIT FOR GREEN...';
  reactionButton.textContent = 'WAIT...';
  reactionButton.disabled = false;
  resultMessage.textContent = '';
  const delay = 1500 + Math.random() * 3000;
  timeoutId = setTimeout(() => {
    if (roundState !== 'waiting') return;
    roundState = 'go';
    startTime = performance.now();
    reactionBox.className = 'reaction-box go';
    reactionMessage.textContent = 'CLICK NOW!';
    reactionButton.textContent = 'REACT!';
  }, delay);
}
function finishRound() {
  if (roundState === 'waiting') {
    clearTimeout(timeoutId);
    roundState = 'idle';
    reactionBox.className = 'reaction-box';
    reactionMessage.textContent = 'TOO SOON!';
    reactionButton.textContent = 'TRY AGAIN';
    resultMessage.textContent = 'False start! Wait until the box turns green.';
    recordAttempt('color', false, null);
    registerComboResult(false);
    return;
  }
  if (roundState !== 'go') { beginRound(); return; }
  const reaction = Math.round(performance.now() - startTime);
  roundState = 'idle';
  reactionBox.className = 'reaction-box';
  reactionMessage.textContent = reaction + ' MS';
  reactionButton.textContent = 'TRY AGAIN';
  const passed = reaction <= colorThresholds[activeLevel - 1];
  recordAttempt('color', passed, reaction);
  registerComboResult(passed);
  if (passed) completeLevel(reaction);
  else resultMessage.textContent = reaction + ' ms — you need ' + colorThresholds[activeLevel - 1] + ' ms or faster. Try again!';
}
function finishHtmlRound(choice) {
  if (roundState !== 'idle') return;
  roundState = 'answered';
  const reaction = Math.round(performance.now() - startTime);
  const question = htmlQuestions[activeLevel - 1];
  htmlOptions.querySelectorAll('button').forEach(button => { button.disabled = true; });
  const passed = choice === question.answer && reaction <= htmlThresholds[activeLevel - 1];
  recordAttempt('html', passed, reaction);
  registerComboResult(passed);
  if (passed) {
    reactionMessage.textContent = question.answer + ' ✓';
    completeLevel(reaction);
  } else if (choice !== question.answer) {
    reactionMessage.textContent = 'NOT QUITE!';
    resultMessage.textContent = 'That is not the right tag. The correct answer is ' + question.answer + '. Try again!';
    showHtmlRetry();
  } else {
    reactionMessage.textContent = 'TOO SLOW!';
    resultMessage.textContent = 'You got it right, but took ' + (reaction / 1000).toFixed(2) + ' seconds. Try to be faster!';
    showHtmlRetry();
  }
}
function showHtmlRetry() {
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.id = 'html-retry-button';
  retry.className = 'start-button game-action';
  retry.textContent = 'TRY AGAIN';
  retry.style.marginTop = '12px';
  retry.addEventListener('click', () => openLevel(activeLevel));
  htmlOptions.insertAdjacentElement('afterend', retry);
}
document.getElementById('levels-button').addEventListener('click', () => { renderStats(); showScreen(modeScreen); });
document.getElementById('home-button').addEventListener('click', () => showScreen(homeScreen));
document.getElementById('modes-back-button').addEventListener('click', () => showScreen(modeScreen));
document.getElementById('color-mode-button').addEventListener('click', () => openMode('color'));
document.getElementById('html-mode-button').addEventListener('click', () => openMode('html'));
document.getElementById('click-mode-button').addEventListener('click', openClickMode);
document.getElementById('levels-back-button').addEventListener('click', () => { clearTimeout(timeoutId); clearInterval(clickInterval); if (activeMode === 'click') showScreen(modeScreen); else { renderLevels(); showScreen(levelsScreen); } });
reactionButton.addEventListener('click', () => {
  if (activeMode === 'click') {
    if (roundState !== 'clicking') startClickTest();
  } else finishRound();
});
reactionBox.addEventListener('click', () => {
  if (activeMode !== 'click' || roundState !== 'clicking') return;
  clickCount++;
  reactionMessage.textContent = clickCount + (clickCount === 1 ? ' CLICK!' : ' CLICKS!');
});
