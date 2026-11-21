const TOTAL_LEVELS = 10;
const thresholds = [800, 700, 600, 550, 500, 450, 400, 350, 300, 250];
const homeScreen = document.getElementById('home-screen');
const levelsScreen = document.getElementById('levels-screen');
const gameScreen = document.getElementById('game-screen');
const levelGrid = document.getElementById('level-grid');
const progressLabel = document.getElementById('progress-label');
const reactionBox = document.getElementById('reaction-box');
const reactionMessage = document.getElementById('reaction-message');
const reactionButton = document.getElementById('reaction-button');
const resultMessage = document.getElementById('result-message');
const targetLabel = document.getElementById('target-label');
const instructions = document.getElementById('game-instructions');
let unlockedLevel = Math.min(TOTAL_LEVELS, Math.max(1, Number(localStorage.getItem('rsa-unlocked-level')) || 1));
let activeLevel = 1;
let startTime = 0;
let timeoutId = null;
let roundState = 'idle';

function showScreen(screen) {
  [homeScreen, levelsScreen, gameScreen].forEach(item => item.classList.add('hidden'));
  screen.classList.remove('hidden');
}
function renderLevels() {
  levelGrid.innerHTML = '';
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const unlocked = level <= unlockedLevel;
    const completed = level < unlockedLevel;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-button' + (unlocked ? ' unlocked' : '') + (completed ? ' completed' : '');
    button.disabled = !unlocked;
    button.innerHTML = '<span class="level-number">0' + level + '</span><span class="level-status">' +
      (completed ? '✓ COMPLETE' : unlocked ? 'UNLOCKED' : '🔒 LOCKED') + '</span>';
    if (unlocked) button.addEventListener('click', () => openLevel(level));
    levelGrid.appendChild(button);
  }
  progressLabel.textContent = 'LEVEL ' + unlockedLevel + ' OF ' + TOTAL_LEVELS + ' UNLOCKED';
}
function openLevel(level) {
  activeLevel = level;
  clearTimeout(timeoutId);
  roundState = 'idle';
  reactionBox.className = 'reaction-box';
  reactionMessage.textContent = 'GET READY';
  document.getElementById('active-level-label').textContent = 'LEVEL ' + level;
  document.getElementById('game-title-active').textContent = 'Level ' + level;
  instructions.textContent = 'Press START ROUND. Wait for the box to turn green, then click as quickly as possible.';
  reactionButton.textContent = 'START ROUND';
  reactionButton.disabled = false;
  resultMessage.textContent = '';
  targetLabel.textContent = 'TARGET: UNDER ' + thresholds[level - 1] + ' MS';
  showScreen(gameScreen);
}
function beginRound() {
  roundState = 'waiting';
  reactionBox.className = 'reaction-box waiting';
  reactionMessage.textContent = 'WAIT FOR GREEN...';
  reactionButton.textContent = 'WAIT...';
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
    return;
  }
  if (roundState !== 'go') {
    beginRound();
    return;
  }
  const reaction = Math.round(performance.now() - startTime);
  roundState = 'idle';
  reactionBox.className = 'reaction-box';
  reactionMessage.textContent = reaction + ' MS';
  reactionButton.textContent = 'TRY AGAIN';
  if (reaction <= thresholds[activeLevel - 1]) {
    resultMessage.textContent = 'Amazing! You passed Level ' + activeLevel + '!';
    if (activeLevel === unlockedLevel && unlockedLevel < TOTAL_LEVELS) {
      unlockedLevel++;
      localStorage.setItem('rsa-unlocked-level', String(unlockedLevel));
    }
    if (activeLevel === TOTAL_LEVELS) {
      resultMessage.textContent = 'INCREDIBLE! YOU COMPLETED THE ARENA!';
    }
    reactionButton.textContent = 'PLAY AGAIN';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'start-button game-action';
    next.style.marginTop = '12px';
    next.textContent = activeLevel === TOTAL_LEVELS ? 'LEVELS' : 'NEXT LEVEL';
    next.addEventListener('click', () => {
      if (activeLevel < TOTAL_LEVELS) openLevel(activeLevel + 1);
      else { renderLevels(); showScreen(levelsScreen); }
    });
    const oldNext = document.getElementById('next-level-button');
    if (oldNext) oldNext.remove();
    next.id = 'next-level-button';
    reactionButton.insertAdjacentElement('afterend', next);
  } else {
    resultMessage.textContent = reaction + ' ms — you need ' + thresholds[activeLevel - 1] + ' ms or faster. Try again!';
    const oldNext = document.getElementById('next-level-button');
    if (oldNext) oldNext.remove();
  }
}
document.getElementById('levels-button').addEventListener('click', () => { renderLevels(); showScreen(levelsScreen); });
document.getElementById('home-button').addEventListener('click', () => showScreen(homeScreen));
document.getElementById('levels-back-button').addEventListener('click', () => { renderLevels(); showScreen(levelsScreen); });
reactionButton.addEventListener('click', finishRound);
