const TOTAL_LEVELS = 10;
const colorThresholds = [800,700,600,550,500,450,400,350,300,250];
const htmlThresholds = [12000,11000,10000,9000,8000,7000,6000,5000,4500,4000];
const htmlQuestions = [
  { prompt:'Which HTML tag creates a paragraph?', answer:'<p>', explanation:"Use <p> for paragraph text. It groups a block of readable text.", choices:['<div>','<h1>','<p>','<span>'] },
  { prompt:'Which tag creates the main, largest heading?', answer:'<h1>', explanation:"Use <h1> for the main page heading. It usually represents the most important heading.", choices:['<h1>','<h2>','<title>','<strong>'] },
  { prompt:'Which tag creates a clickable link?', answer:'<a>', explanation:"Use <a> to create a hyperlink. The href attribute tells the browser where it leads.", choices:['<link>','<a>','<href>','<nav>'] },
  { prompt:'Which tag displays an image?', answer:'<img>', explanation:"Use <img> to display an image. The src attribute points to the image file.", choices:['<image>','<src>','<picture>','<img>'] },
  { prompt:'Which tag inserts a line break?', answer:'<br>', explanation:"Use <br> to start a new line without creating a new paragraph.", choices:['<hr>','<break>','<br>','<p>'] },
  { prompt:'Which tag creates an unordered (bulleted) list?', answer:'<ul>', explanation:"Use <ul> for an unordered list. The list items go inside it as <li> elements.", choices:['<ol>','<li>','<ul>','<list>'] },
  { prompt:'Which tag defines one item inside a list?', answer:'<li>', explanation:"Use <li> for each individual item inside an ordered or unordered list.", choices:['<li>','<ul>','<ol>','<item>'] },
  { prompt:'Which tag creates a clickable button?', answer:'<button>', explanation:"Use <button> for an interactive button that users can click.", choices:['<input>','<click>','<btn>','<button>'] },
  { prompt:'Which tag creates an input field for user data?', answer:'<input>', explanation:"Use <input> to let users enter data, such as a name or email address.", choices:['<form>','<input>','<textarea>','<label>'] },
  { prompt:'Which tag is the root element of an HTML page?', answer:'<html>', explanation:"The <html> element wraps the entire HTML document, including head and body.", choices:['<head>','<body>','<main>','<html>'] }
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
let mysteryActive = false;
let mysteryRound = 0;
const MYSTERY_TOTAL_ROUNDS = 5;
let lastMysteryMode = '';
function finishMysteryRound() {
  if (!mysteryActive || document.getElementById('mystery-next-button')) return;
  reactionButton.disabled = true;
  const completed = mysteryRound >= MYSTERY_TOTAL_ROUNDS;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'mystery-next-button';
  button.className = 'start-button mystery-next-button';
  button.textContent = completed ? 'CLAIM MYSTERY BONUS' : 'NEXT MYSTERY';
  button.addEventListener('click', () => {
    button.remove();
    if (completed) {
      const bonus = 75;
      const unlocked = awardXP(bonus);
      showRewardSummary('mystery',bonus,unlocked,'You completed all five surprise rounds. The arena rewards your adaptability!');
      resultMessage.textContent = 'MYSTERY MASTER! You conquered all five surprise rounds.';
      mysteryActive = false;
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'back-button';
      back.textContent = 'BACK TO ARENA';
      back.addEventListener('click',() => { mysteryActive=false; showScreen(modeScreen); });
      document.getElementById('target-label').insertAdjacentElement('afterend',back);
    } else {
      startMysteryChallenge();
    }
  });
  const anchor = document.getElementById('target-label');
  anchor.insertAdjacentElement('afterend',button);
}
function startMysteryChallenge() {
  const choices = ['color','html','click','code'].filter(mode => mode !== lastMysteryMode);
  const chosen = choices[Math.floor(Math.random()*choices.length)];
  lastMysteryMode = chosen;
  mysteryRound++;
  const label = 'MYSTERY ROUND ' + mysteryRound + ' / ' + MYSTERY_TOTAL_ROUNDS;
  if (chosen === 'color' || chosen === 'html') {
    openMode(chosen);
    const unlocked = chosen === 'color' ? colorUnlocked : htmlUnlocked;
    openLevel(Math.floor(Math.random()*unlocked)+1);
    document.getElementById('active-level-label').textContent = label + ' • ' + (chosen === 'color' ? 'COLOR REACTION' : 'HTML SPEED');
  } else if (chosen === 'click') {
    openClickMode();
    document.getElementById('active-level-label').textContent = label + ' • CLICK SPEED';
  } else {
    raceLanguage.value = 'All';
    openCodeRace();
    document.querySelector('#race-screen .eyebrow').textContent = label + ' • SURPRISE CODE RACE';
  }
}
function beginMysteryMode() {
  mysteryActive = true;
  mysteryRound = 0;
  lastMysteryMode = '';
  startMysteryChallenge();
}

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

const XP_PER_LEVEL = 250;
const achievementCatalog = {
  first_game:{name:'FIRST VICTORY',icon:'🎯',description:'Complete your first challenge.'},
  combo_5:{name:'UNSTOPPABLE',icon:'🔥',description:'Reach a 5x combo.'},
  lightning:{name:'LIGHTNING REFLEX',icon:'⚡',description:'React in 250 ms or less.'},
  clicker:{name:'CLICK MACHINE',icon:'🖱️',description:'Reach 5 clicks per second.'},
  code_master:{name:'CODE MASTER',icon:'💻',description:'Reach 40 WPM in Code Race.'}
};
function readPlayerProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('rsa-player-profile') || '{}');
    return {xp:Number.isFinite(saved.xp) ? Math.max(0,saved.xp) : 0,games:Number.isFinite(saved.games) ? saved.games : 0,achievements:Array.isArray(saved.achievements) ? saved.achievements : []};
  } catch (error) { return {xp:0,games:0,achievements:[]}; }
}
const playerProfile = readPlayerProfile();
function playerLevel() { return Math.floor(playerProfile.xp / XP_PER_LEVEL) + 1; }
function renderProfile() {
  const level = playerLevel();
  const inLevel = playerProfile.xp % XP_PER_LEVEL;
  const rank = level >= 10 ? 'ARENA LEGEND' : level >= 7 ? 'SPEED MASTER' : level >= 4 ? 'QUICK THINKER' : 'ROOKIE';
  const rankNode = document.getElementById('player-rank');
  if (!rankNode) return;
  rankNode.textContent = rank;
  document.getElementById('player-xp').textContent = playerProfile.xp;
  document.getElementById('player-level').textContent = 'LEVEL ' + level;
  document.getElementById('xp-to-next').textContent = inLevel + ' / ' + XP_PER_LEVEL + ' XP';
  document.getElementById('xp-fill').style.width = (inLevel / XP_PER_LEVEL * 100) + '%';
  document.getElementById('achievement-summary').textContent = '🏅 ' + playerProfile.achievements.length + ' ACHIEVEMENT' + (playerProfile.achievements.length === 1 ? '' : 'S') + ' UNLOCKED';
}
function awardXP(amount, achievementKeys=[]) {
  playerProfile.xp += amount;
  playerProfile.games++;
  const unlocked = [];
  if (playerProfile.games === 1 && !playerProfile.achievements.includes('first_game')) achievementKeys.push('first_game');
  achievementKeys.forEach(key => {
    if (achievementCatalog[key] && !playerProfile.achievements.includes(key)) {
      playerProfile.achievements.push(key);
      unlocked.push(achievementCatalog[key]);
    }
  });
  localStorage.setItem('rsa-player-profile',JSON.stringify(playerProfile));
  renderProfile();
  return unlocked;
}

// DAILY CHALLENGES — three date-based missions, with progress saved locally.
const DAILY_CHALLENGE_POOL = [
  {id:'reaction',title:'LIGHTNING REFLEX',description:'Get under 300 ms in Color Reaction.',goal:'< 300 ms',type:'color'},
  {id:'code',title:'CODE SPRINTER',description:'Reach 40 WPM in Code Race.',goal:'40 WPM',type:'code'},
  {id:'click',title:'CLICK STORM',description:'Reach 100 clicks in a 30-second test.',goal:'100 clicks',type:'click'},
  {id:'html',title:'HTML PERFECTIONIST',description:'Complete 3 HTML levels in a row without mistakes.',goal:'3 perfect levels',type:'html'}
];
function localDateKey() {
  const now = new Date();
  return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
}
function makeDailyChallenges() {
  const dayNumber = Math.floor(new Date(localDateKey()+'T00:00:00').getTime()/86400000);
  const ordered = DAILY_CHALLENGE_POOL.map((item,index)=>({item,sort:Math.sin((dayNumber+1)*(index+3)*12.9898)*43758.5453%1}))
    .sort((a,b)=>a.sort-b.sort).map(entry=>entry.item);
  return ordered.slice(0,3);
}
function readDailyState() {
  const today=localDateKey();
  try {
    const saved=JSON.parse(localStorage.getItem('rsa-daily-challenges')||'null');
    if(saved && saved.date===today && Array.isArray(saved.challenges)) return saved;
  } catch(error) {}
  return {date:today,challenges:makeDailyChallenges().map(item=>({id:item.id,progress:0,completed:false}))};
}
let dailyState=readDailyState();
function saveDailyState() { localStorage.setItem('rsa-daily-challenges',JSON.stringify(dailyState)); }
function renderDailyChallenges() {
  const list=document.getElementById('daily-challenge-list');
  if(!list) return;
  const definitions=dailyState.challenges.map(entry=>({...DAILY_CHALLENGE_POOL.find(item=>item.id===entry.id),...entry}));
  list.innerHTML=definitions.map(item=>{
    const progressText=item.id==='reaction' ? (item.completed?'PERSONAL BEST REACHED': 'BEST: '+(item.progress?item.progress+' ms':'—')) :
      item.id==='code' ? (item.completed?'40+ WPM REACHED': 'BEST: '+(item.progress?Number(item.progress).toFixed(1)+' WPM':'—')) :
      item.id==='click' ? (item.completed?'100+ CLICKS REACHED': 'BEST: '+item.progress+'/100') :
      (item.completed?'3 PERFECT LEVELS':'STREAK: '+item.progress+'/3');
    return '<article class="daily-item daily-'+item.id+' '+(item.completed?'is-complete':'')+'"><span class="daily-status">'+(item.completed?'✓':'✦')+'</span><div class="daily-copy"><strong>'+item.title+'</strong><p>'+item.description+'</p><small>'+progressText+'</small></div><span class="daily-reward">'+(item.completed?'CLAIMED':'+50 XP')+'</span></article>';
  }).join('');
  const completed=dailyState.challenges.filter(item=>item.completed).length;
  document.getElementById('daily-progress-label').textContent=completed+' / 3 COMPLETE';
  document.getElementById('daily-bonus-label').textContent=completed===3?'ALL DAILY MISSIONS CLEARED!': 'UP TO +150 BONUS XP';
}
function updateDailyChallenge(type,value) {
  let changed=false;
  dailyState.challenges.forEach(entry=>{
    if(entry.completed) return;
    const definition=DAILY_CHALLENGE_POOL.find(item=>item.id===entry.id);
    if(!definition || definition.type!==type) return;
    if(type==='color') {
      if(value<300 && (!entry.progress || value<entry.progress)) entry.progress=value;
      if(value<300) entry.completed=true;
    } else if(type==='code') {
      if(value>entry.progress) entry.progress=value;
      if(value>=40) entry.completed=true;
    } else if(type==='click') {
      if(value>entry.progress) entry.progress=Math.min(100,value);
      if(value>=100) entry.completed=true;
    } else if(type==='html') {
      entry.progress=value;
      if(value>=3) entry.completed=true;
    }
    if(entry.completed) {
      changed=true;
      const unlocked=awardXP(50);
      showRewardSummary('daily',50,unlocked,'Daily challenge completed: '+definition.title+'.');
    }
  });
  saveDailyState();
  renderDailyChallenges();
}
function updateDailyHtmlLevel(level) {
  const entry=dailyState.challenges.find(item=>item.id==='html' && !item.completed);
  if(!entry) return;
  if(!Array.isArray(entry.levels)) entry.levels=[];
  if(!entry.levels.includes(level)) entry.levels.push(level);
  entry.progress=entry.levels.length;
  if(entry.progress>=3) {
    entry.completed=true;
    const unlocked=awardXP(50);
    showRewardSummary('daily',50,unlocked,'Daily challenge completed: HTML PERFECTIONIST.');
  }
  saveDailyState();
  renderDailyChallenges();
}
function resetDailyHtmlStreak() {
  dailyState.challenges.forEach(entry=>{
    if(entry.id==='html' && !entry.completed) { entry.progress=0; entry.levels=[]; }
  });
  saveDailyState();
  renderDailyChallenges();
}
renderDailyChallenges();

function showRewardSummary(mode, amount, unlocked, detail) {
  const panel = document.getElementById('reward-summary');
  if (!panel) return;
  const level = playerLevel();
  const progress = playerProfile.xp % XP_PER_LEVEL;
  const achievements = unlocked.length
    ? '<div class="new-achievements"><span>ACHIEVEMENT UNLOCKED</span>' + unlocked.map(item => '<div class="achievement-unlock"><b>' + item.icon + ' ' + item.name + '</b><small>' + item.description + '</small></div>').join('') + '</div>'
    : '<p class="no-achievement">Keep playing to unlock your next achievement.</p>';
  panel.innerHTML = '<div class="reward-heading">CHALLENGE COMPLETE</div><div class="reward-xp">+' + amount + ' XP <span>earned</span></div><p class="reward-detail">' + detail + '</p>' + achievements + '<div class="reward-progress"><div><b>LEVEL ' + level + '</b><span>' + progress + ' / ' + XP_PER_LEVEL + ' XP TO NEXT LEVEL</span></div><div class="xp-track"><span style="width:' + (progress / XP_PER_LEVEL * 100) + '%"></span></div></div>';
  panel.classList.remove('hidden');
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
  renderProfile();
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
  [homeScreen,modeScreen,levelsScreen,gameScreen,raceScreen].forEach(item => item.classList.add('hidden'));
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
  setupClickTargets();
  reactionMessage.textContent = 'READY?';
  resultMessage.textContent = '';
  document.getElementById('reward-summary').classList.add('hidden');
  targetLabel.textContent = 'YOUR BEST: ' + (clickBestCps ? clickBestCps.toFixed(2) + ' CLICKS / SEC' : 'NO RECORD YET');
  document.getElementById('combo-label').classList.add('hidden');
  showScreen(gameScreen);
  moveClickTargets();
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
  reactionMessage.classList.remove('click-counter-pop');
  reactionBox.querySelectorAll('.click-float').forEach(item => item.remove());
  reactionBox.classList.add('click-active');
  moveClickTargets();
  resultMessage.textContent = 'CLICK AS FAST AS YOU CAN!';
  targetLabel.textContent = 'TIME LEFT: ' + clickDuration + ' SECONDS';
  clearInterval(clickTargetMoveTimer);
  clickTargetMoveTimer = setInterval(() => { if (roundState === 'clicking') moveClickTargets(); },950);
  clearTimeout(goldenSpawnTimer);
  goldenSpawnTimer = setTimeout(() => { const gold=reactionBox.querySelector('.golden-powerup'); if (gold && roundState==='clicking') gold.style.display='grid'; },3500);
  clickInterval = setInterval(() => {
    const remaining = Math.max(0, (clickEndsAt - Date.now()) / 1000);
    targetLabel.textContent = 'TIME LEFT: ' + remaining.toFixed(1) + ' SECONDS';
    if (remaining <= 0) finishClickTest();
  }, 50);
}
function finishClickTest() {
  clearInterval(clickInterval);
  clearInterval(clickTargetMoveTimer);
  clearTimeout(goldenSpawnTimer);
  clickInterval = null;
  roundState = 'finished';
  reactionBox.classList.remove('click-active');
  reactionBox.querySelectorAll('.moving-click-target,.golden-powerup').forEach(node => node.style.display='none');
  if (clickDuration === 30) updateDailyChallenge('click',clickCount);
  const cps = clickCount / clickDuration;
  const xpEarned = Math.max(10,Math.round(10 + cps * 5));
  const unlockedAchievements = awardXP(xpEarned,cps >= 5 ? ['clicker'] : []);
  showRewardSummary('click',xpEarned,unlockedAchievements,'You scored ' + clickCount + ' clicks at ' + cps.toFixed(2) + ' clicks per second.');
  playSound('finish');
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
  if (mysteryActive) finishMysteryRound();
}
function openLevel(level) {
  activeLevel = level;
  document.getElementById('click-settings').classList.add('hidden');
  document.getElementById('combo-label').classList.remove('hidden');
  clearTimeout(timeoutId);
  clearInterval(clickInterval);
  clearInterval(clickTargetMoveTimer);
  clearTimeout(goldenSpawnTimer);
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
  document.getElementById('reward-summary').classList.add('hidden');
  updateCombo();
  if (activeMode === 'color') {
    instructions.textContent = 'Press START ROUND. Wait for the box to turn green, then click as quickly as possible.';
    reactionMessage.textContent = 'GET READY';
    reactionButton.textContent = 'START ROUND';
    reactionButton.disabled = false;
    targetLabel.textContent = 'TARGET: UNDER ' + colorThresholds[level - 1] + ' MS';
  } else {
    const question = htmlQuestions[level - 1];
    instructions.textContent = 'Type the correct HTML tag yourself, then press ENTER or SUBMIT. Your time starts now!';
    reactionMessage.textContent = question.prompt;
    htmlOptions.classList.remove('hidden');
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.className = 'html-answer-input';
    answerInput.id = 'html-answer-input';
    answerInput.placeholder = 'Type your HTML tag...';
    answerInput.autocomplete = 'off';
    answerInput.spellcheck = false;
    answerInput.setAttribute('aria-label','Type your HTML answer');
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'answer-button html-submit-button';
    submit.textContent = 'SUBMIT ANSWER';
    const submitAnswer = () => finishHtmlRound(answerInput.value.trim());
    submit.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') submitAnswer();
    });
    htmlOptions.append(answerInput, submit);
    startTime = performance.now();
    targetLabel.textContent = 'TIME LIMIT: ' + (htmlThresholds[level - 1] / 1000).toFixed(1) + ' SECONDS';
    answerInput.focus();
  }
  showScreen(gameScreen);
}
function completeLevel(reaction) {
  if (activeMode === 'color') updateDailyChallenge('color',reaction);
  if (activeMode === 'html') updateDailyHtmlLevel(activeLevel);
  let unlocked = getUnlocked();
  if (activeLevel === unlocked && unlocked < TOTAL_LEVELS) {
    unlocked++;
    if (activeMode === 'color') colorUnlocked = unlocked;
    else htmlUnlocked = unlocked;
    saveProgress();
  }
  const comboBonus = Math.min(50, Math.max(0, comboStreaks[activeMode] - 1) * 5);
  const xpEarned = 50 + comboBonus;
  const achievements = [];
  if (comboStreaks[activeMode] >= 5) achievements.push('combo_5');
  if (activeMode === 'color' && reaction <= 250) achievements.push('lightning');
  const unlockedAchievements = awardXP(xpEarned,achievements);
  showRewardSummary(activeMode,xpEarned,unlockedAchievements,'You cleared level ' + activeLevel + ' in ' + reaction + ' ms.');
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
  if (mysteryActive) {
    next.remove();
    finishMysteryRound();
  }
}
function beginRound() {
  removeNextButton();
  roundState = 'waiting';
  reactionBox.className = 'reaction-box waiting';
  reactionMessage.textContent = 'WAIT FOR GREEN...';
  reactionButton.textContent = 'WAIT...';
  reactionButton.disabled = false;
  resultMessage.textContent = 'Watch carefully — some colors are fake-outs!';
  const delay = 1500 + Math.random() * 2600;
  timeoutId = setTimeout(() => {
    if (roundState !== 'waiting') return;
    if (Math.random() < 0.55) {
      roundState = 'fakeout';
      reactionBox.className = 'reaction-box fakeout';
      reactionMessage.textContent = 'NOT YET!';
      timeoutId = setTimeout(() => {
        if (roundState !== 'fakeout') return;
        roundState = 'waiting';
        reactionBox.className = 'reaction-box waiting';
        reactionMessage.textContent = 'WAIT FOR GREEN...';
        timeoutId = setTimeout(showGreenSignal, 550 + Math.random() * 950);
      }, 650);
    } else showGreenSignal();
  }, delay);
}
function showGreenSignal() {
  if (roundState !== 'waiting') return;
  roundState = 'go';
  startTime = performance.now();
  reactionBox.className = 'reaction-box go';
  reactionMessage.textContent = 'CLICK NOW!';
  reactionButton.textContent = 'REACT!';
  playSound('go');
}
function finishRound() {
  if (roundState === 'fakeout') {
    clearTimeout(timeoutId); roundState = 'idle'; reactionBox.className = 'reaction-box';
    reactionMessage.textContent = 'FAKE-OUT!'; reactionButton.textContent = 'TRY AGAIN';
    resultMessage.textContent = 'That color was a trick! That counts as a false start and resets your combo. Stay sharp and try again.';
    recordAttempt('color', false, null); registerComboResult(false); playSound('error'); return;
  }
  if (roundState === 'waiting') {
    clearTimeout(timeoutId);
    roundState = 'idle';
    reactionBox.className = 'reaction-box';
    reactionMessage.textContent = 'TOO SOON!';
    reactionButton.textContent = 'TRY AGAIN';
    resultMessage.textContent = 'False start! Wait until the box turns green.';
    playSound('error');
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
  playSound(passed ? 'success' : 'error');
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
  htmlOptions.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
  const passed = choice.toLowerCase() === question.answer.toLowerCase() && reaction <= htmlThresholds[activeLevel - 1];
  recordAttempt('html', passed, reaction);
  registerComboResult(passed);
  const explanation = question.explanation || 'Review the tag and what it does in an HTML page.';
  if (passed) {
    reactionMessage.textContent = question.answer + ' ✓';
    resultMessage.textContent = 'Correct! ' + explanation;
    playSound('success');
    completeLevel(reaction);
    resultMessage.textContent = 'Correct! ' + explanation + ' Level cleared!';
  } else if (choice.toLowerCase() !== question.answer.toLowerCase()) {
    resetDailyHtmlStreak();
    reactionMessage.textContent = 'NOT QUITE!';
    resultMessage.textContent = 'Not quite. The correct answer is ' + question.answer + '. ' + explanation;
    playSound('error');
    showHtmlRetry();
  } else {
    reactionMessage.textContent = 'TOO SLOW!';
    resultMessage.textContent = 'Correct, but too slow. ' + explanation;
    playSound('error');
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
reactionBox.addEventListener('click', event => {
  if (activeMode !== 'click' || roundState !== 'clicking') return;
  clickCount++;
  playSound('click');
  reactionMessage.textContent = clickCount + (clickCount === 1 ? ' CLICK!' : ' CLICKS!');
  reactionMessage.classList.remove('click-counter-pop');
  void reactionMessage.offsetWidth;
  reactionMessage.classList.add('click-counter-pop');

  const burst = document.createElement('span');
  burst.className = 'click-float';
  burst.textContent = '+1';
  const bounds = reactionBox.getBoundingClientRect();
  const x = Math.max(12, Math.min(bounds.width - 48, event.clientX - bounds.left - 12));
  const y = Math.max(18, Math.min(bounds.height - 34, event.clientY - bounds.top - 8));
  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  reactionBox.appendChild(burst);
  burst.addEventListener('animationend', () => burst.remove(), { once:true });
});


// CODE RACE mode
const raceScreen = document.getElementById('race-screen');
const raceTrack = document.getElementById('race-track');
const raceInput = document.getElementById('race-input');
const raceCodeDisplay = document.getElementById('race-code-display');
const raceProgress = document.getElementById('race-progress');
const raceHint = document.getElementById('race-hint');
const raceResult = document.getElementById('race-result');
const raceStartButton = document.getElementById('race-start-button');
const raceLanguage = document.getElementById('race-language');
const raceSnippets = [{"lang":"C++","name":"Bubble Sort","code":"void bubbleSort(vector<int>& values) {\n    int n = values.size();\n    for (int i = 0; i < n - 1; i++) {\n        for (int j = 0; j < n - i - 1; j++) {\n            if (values[j] > values[j + 1])\n                swap(values[j], values[j + 1]);\n        }\n    }\n}"},{"lang":"C++","name":"Binary Search","code":"int binarySearch(vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}"},{"lang":"C++","name":"Factorial","code":"int factorial(int number) {\n    int result = 1;\n    for (int i = 2; i <= number; i++) {\n        result *= i;\n    }\n    return result;\n}"},{"lang":"C++","name":"Quick Sort","code":"void quickSort(vector<int>& data, int low, int high) {\n    if (low >= high) return;\n    int pivot = data[high];\n    int split = low;\n    for (int i = low; i < high; i++) {\n        if (data[i] < pivot) swap(data[i], data[split++]);\n    }\n    swap(data[split], data[high]);\n    quickSort(data, low, split - 1);\n    quickSort(data, split + 1, high);\n}"},{"lang":"Python","name":"FizzBuzz","code":"def fizz_buzz(limit):\n    for number in range(1, limit + 1):\n        if number % 15 == 0:\n            print(\"FizzBuzz\")\n        elif number % 3 == 0:\n            print(\"Fizz\")\n        elif number % 5 == 0:\n            print(\"Buzz\")\n        else:\n            print(number)"},{"lang":"Python","name":"List Comprehension","code":"def get_even_squares(numbers):\n    squares = [\n        value * value\n        for value in numbers\n        if value % 2 == 0\n    ]\n    return squares\n\nvalues = [1, 2, 3, 4, 5, 6]\nprint(get_even_squares(values))"},{"lang":"Python","name":"Class and Method","code":"class Player:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\n    def add_points(self, points):\n        self.score += points\n        return self.score\n\nhero = Player(\"Nova\", 10)\nprint(hero.add_points(5))"},{"lang":"Python","name":"Binary Search","code":"def binary_search(items, target):\n    low, high = 0, len(items) - 1\n    while low <= high:\n        middle = (low + high) // 2\n        if items[middle] == target:\n            return middle\n        if items[middle] < target:\n            low = middle + 1\n        else:\n            high = middle - 1\n    return -1"},{"lang":"JavaScript","name":"Array Map","code":"const prices = [12, 18, 25, 30];\nconst withTax = prices.map((price) => {\n    const tax = price * 0.08;\n    return price + tax;\n});\nwithTax.forEach((price, index) => {\n    console.log(`Item ${index + 1}: ${price}`);\n});"},{"lang":"JavaScript","name":"Count Vowels","code":"function countVowels(sentence) {\n    const vowels = \"aeiou\";\n    let total = 0;\n    for (const letter of sentence.toLowerCase()) {\n        if (vowels.includes(letter)) total++;\n    }\n    return total;\n}\nconsole.log(countVowels(\"Code Race\"));"},{"lang":"JavaScript","name":"Class","code":"class Racer {\n    constructor(name, speed) {\n        this.name = name;\n        this.speed = speed;\n    }\n    accelerate(amount) {\n        this.speed += amount;\n        return this.speed;\n    }\n}\nconst driver = new Racer(\"Nova\", 40);\nconsole.log(driver.accelerate(10));"},{"lang":"JavaScript","name":"Sort Numbers","code":"function sortScores(scores) {\n    return scores.slice().sort((a, b) => a - b);\n}\nconst results = [42, 15, 88, 31, 67];\nconst sorted = sortScores(results);\nfor (const score of sorted) {\n    console.log(score);\n}"},{"lang":"Java","name":"Array Average","code":"public static double average(int[] numbers) {\n    int total = 0;\n    for (int number : numbers) {\n        total += number;\n    }\n    if (numbers.length == 0) return 0;\n    return (double) total / numbers.length;\n}"},{"lang":"Java","name":"Class and Object","code":"class Robot {\n    String name;\n    int battery;\n    Robot(String name, int battery) {\n        this.name = name;\n        this.battery = battery;\n    }\n    void recharge(int amount) {\n        battery = Math.min(100, battery + amount);\n    }\n}"},{"lang":"Java","name":"Find Maximum","code":"public static int findMaximum(int[] values) {\n    int maximum = values[0];\n    for (int index = 1; index < values.length; index++) {\n        if (values[index] > maximum) {\n            maximum = values[index];\n        }\n    }\n    return maximum;\n}"},{"lang":"HTML","name":"Profile Card","code":"<section class=\"profile-card\">\n    <img src=\"avatar.png\" alt=\"Player avatar\">\n    <div class=\"profile-info\">\n        <h2>Nova Player</h2>\n        <p>Ready for the next challenge.</p>\n        <a href=\"/profile\">View profile</a>\n    </div>\n</section>"},{"lang":"HTML","name":"Signup Form","code":"<form class=\"signup-form\">\n    <label for=\"username\">Username</label>\n    <input id=\"username\" name=\"username\" required>\n    <label for=\"email\">Email address</label>\n    <input id=\"email\" type=\"email\" required>\n    <button type=\"submit\">Create account</button>\n</form>"},{"lang":"CSS","name":"Flexbox Layout","code":".card-container {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    justify-content: space-between;\n    gap: 1rem;\n    padding: 24px;\n}\n.card-container .card {\n    flex: 1 1 220px;\n}"},{"lang":"CSS","name":"Button Hover","code":".neon-button {\n    color: #ffffff;\n    background: #263d78;\n    border: 1px solid #70baff;\n    border-radius: 10px;\n    padding: 12px 24px;\n    transition: transform .2s, box-shadow .2s;\n}\n.neon-button:hover {\n    transform: translateY(-3px);\n    box-shadow: 0 0 20px #786cff;\n}"}];
let lastRaceSnippetIndex = -1;
let raceCode = '';
let raceStartedAt = 0;
let raceTimer = null;
let raceTyped = '';
let raceAttempt = '';
let raceKeystrokes = 0;
let raceMistakes = 0;
let raceBots = [];
let raceFinishOrder = 0;
let raceFinished = false;
let raceBest = JSON.parse(localStorage.getItem('rsa-code-best') || 'null');
function renderCodeRecord() {
  const best = document.getElementById('code-best');
  const accuracy = document.getElementById('code-accuracy');
  if (best) best.textContent = raceBest && raceBest.wpm ? raceBest.wpm.toFixed(1) : '—';
  if (accuracy) accuracy.textContent = raceBest ? 'Accuracy: ' + raceBest.accuracy.toFixed(1) + '%' : 'Accuracy: —';
}
function carSvg(color) {
  return '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M8 20 L12 12 Q14 9 20 9 L43 9 Q48 9 52 16 L57 18 L59 24 L5 24 Z" fill="' + color + '" stroke="#dcecff" stroke-width="1.3"/><path d="M19 11 L25 11 L25 17 L14 17 Z M29 11 L42 11 Q46 12 49 17 L29 17 Z" fill="#b9e5ff" opacity=".85"/><circle cx="17" cy="25" r="5" fill="#101827" stroke="#b9c9e2" stroke-width="1.5"/><circle cx="47" cy="25" r="5" fill="#101827" stroke="#b9c9e2" stroke-width="1.5"/><path d="M7 20 L3 20 L3 23 L8 23" fill="#ffe39a"/></svg>';
}
function openCodeRace() {
  clearInterval(raceTimer);
  raceFinished = false;
  raceFinishOrder = 0;
  raceTyped = '';
  raceAttempt = '';
  raceKeystrokes = 0;
  raceMistakes = 0;
  const selectedLanguage = raceLanguage.value;
  const availableSnippets = raceSnippets.map((snippet,index) => ({...snippet,index})).filter(snippet => selectedLanguage === 'All' || snippet.lang === selectedLanguage);
  let chosenSnippet = availableSnippets[Math.floor(Math.random() * availableSnippets.length)];
  if (availableSnippets.length > 1 && chosenSnippet.index === lastRaceSnippetIndex) {
    const alternatives = availableSnippets.filter(snippet => snippet.index !== lastRaceSnippetIndex);
    chosenSnippet = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  lastRaceSnippetIndex = chosenSnippet.index;
  raceCode = chosenSnippet.code;
  raceBots = ['Guest','Guest','Guest'].map((name,index) => ({
    name, color:['#b38aff','#ff9a76','#73dfc1'][index],
    wpm:15 + Math.random()*45, progress:0, finished:false, finishAt:null
  }));
  raceInput.value = '';
  raceInput.disabled = true;
  raceResult.classList.add('hidden');
  raceResult.innerHTML = '';
  raceStartButton.disabled = false;
  raceStartButton.textContent = 'START RACE';
  raceHint.textContent = 'Snippet: ' + raceSnippets[lastRaceSnippetIndex].lang + ' — ' + raceSnippets[lastRaceSnippetIndex].name + '. Press START RACE, then type it exactly.';
  raceProgress.textContent = '0%';
  renderRaceCode();
  renderRaceTrack();
  renderCodeRecord();
  showScreen(raceScreen);
}
function renderRaceTrack() {
  const drivers = [{name:'Guest (you)',you:true,color:'#58aaff',progress:raceCode.length ? raceTyped.length/raceCode.length : 0,wpm:currentRaceWpm(),finished:raceTyped.length>=raceCode.length},...raceBots];
  raceTrack.innerHTML = '';
  drivers.forEach((driver,index) => {
    const lane = document.createElement('div');
    lane.className = 'race-lane';
    const name = document.createElement('div');
    name.className = 'race-driver' + (driver.you ? ' you' : '');
    name.textContent = driver.name;
    const road = document.createElement('div');
    road.className = 'race-road';
    const line = document.createElement('span'); line.className = 'race-road-line'; road.appendChild(line);
    const car = document.createElement('div'); car.className = 'race-car'; car.style.left = Math.min(94,Math.max(0,driver.progress*94)) + '%'; car.innerHTML = carSvg(driver.color); road.appendChild(car);
    const wpm = document.createElement('div'); wpm.className='race-wpm'; wpm.textContent = Math.round(driver.wpm || 0) + ' WPM';
    lane.append(name,road,wpm);
    if (!driver.you && driver.finished) {
      const place = document.createElement('span'); place.className='race-place'; place.textContent = driver.place || ''; lane.appendChild(place);
    }
    raceTrack.appendChild(lane);
  });
}
function currentRaceWpm() {
  const minutes = (Date.now()-raceStartedAt)/60000;
  return raceStartedAt && minutes>0 ? (raceTyped.length/5)/minutes : 0;
}
function renderRaceCode() {
  const typedLength = raceTyped.length;
  const attemptedLength = raceAttempt.length;
  let html = '';
  for (let i=0;i<raceCode.length;i++) {
    const ch = raceCode[i];
    const shown = ch === ' ' ? '&nbsp;' : ch === '\n' ? '↵\n' : ch === '\t' ? '⇥' : ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let cls = '';
    if (i < attemptedLength) cls = raceAttempt[i] === ch ? 'typed' : 'mistake';
    else if (i === typedLength) cls = 'current';
    html += '<span class="' + cls + '">' + shown + '</span>';
  }
  raceCodeDisplay.innerHTML = html;
  const current = raceCodeDisplay.querySelector('.current');
  if (current) current.scrollIntoView({block:'nearest'});
  raceProgress.textContent = Math.floor(typedLength/raceCode.length*100) + '%';
}
function updateRace() {
  const elapsed = (Date.now()-raceStartedAt)/60000;
  raceBots.forEach(bot => {
    if (bot.finished) return;
    bot.progress = Math.min(1, (bot.wpm*5*elapsed)/raceCode.length);
    if (bot.progress >= 1) { bot.finished=true; bot.finishAt=Date.now(); raceFinishOrder++; bot.place = raceFinishOrder + 'st Place'; }
  });
  renderRaceTrack();
}
function startCodeRace() {
  if (raceTimer) clearInterval(raceTimer);
  raceStartedAt = Date.now();
  raceFinished = false;
  raceStartButton.disabled = true;
  raceStartButton.textContent = 'RACE IN PROGRESS';
  raceInput.disabled = false;
  raceLanguage.disabled = true;
  raceInput.focus();
  raceHint.textContent = 'Type every character exactly. Mistakes are highlighted red; fix them to continue.';
  raceTimer = setInterval(updateRace,120);
}
function handleRaceInput() {
  if (!raceStartedAt || raceFinished) return;
  const entered = raceInput.value;
  raceAttempt = entered;
  raceKeystrokes = Math.max(raceKeystrokes, entered.length);
  let validPrefix = 0;
  for (let i=0;i<Math.min(entered.length,raceCode.length);i++) {
    if (entered[i] !== raceCode[i]) break;
    validPrefix++;
  }
  raceMistakes = Math.max(raceMistakes, entered.length-validPrefix);
  // Mistakes must be corrected: only the matching prefix counts as progress.
  raceTyped = entered.slice(0,validPrefix);
  if (validPrefix !== entered.length) {
    raceHint.textContent = 'There is a mistake in red. Correct it before continuing.';
  } else {
    raceHint.textContent = 'Perfect so far — keep typing!';
  }
  renderRaceCode();
  updateRace();
  if (raceTyped.length === raceCode.length) finishCodeRace();
}
function finishCodeRace() {
  if (raceFinished) return;
  raceFinished = true;
  clearInterval(raceTimer);
  raceTimer = null;
  raceInput.disabled = true;
  raceLanguage.disabled = false;
  const elapsedMinutes = Math.max((Date.now()-raceStartedAt)/60000,1/60000);
  const wpm = (raceTyped.length/5)/elapsedMinutes;
  const accuracy = raceKeystrokes ? Math.max(0,(raceKeystrokes-raceMistakes)/raceKeystrokes*100) : 100;
  updateDailyChallenge('code',wpm);
  const botsAhead = raceBots.filter(bot => bot.progress > raceTyped.length/raceCode.length).length;
  const place = botsAhead >= 3 ? '4th Place' : botsAhead === 2 ? '3rd Place' : botsAhead === 1 ? '2nd Place' : '1st Place';
  const xpEarned = 20 + (place === '1st Place' ? 30 : place === '2nd Place' ? 20 : place === '3rd Place' ? 10 : 0) + (accuracy >= 95 ? 10 : 0);
  const unlockedAchievements = awardXP(xpEarned,wpm >= 40 ? ['code_master'] : []);
  const rewardHtml = '<div class="reward-heading">RACE REWARDS</div><div class="reward-xp">+' + xpEarned + ' XP <span>earned</span></div><p class="reward-detail">' + place + ' finish • ' + wpm.toFixed(1) + ' WPM • ' + accuracy.toFixed(1) + '% accuracy</p>' + (unlockedAchievements.length ? '<div class="new-achievements"><span>ACHIEVEMENT UNLOCKED</span>' + unlockedAchievements.map(item => '<div class="achievement-unlock"><b>' + item.icon + ' ' + item.name + '</b><small>' + item.description + '</small></div>').join('') + '</div>' : '<p class="no-achievement">Keep racing to unlock your next achievement.</p>') + '<div class="reward-progress"><div><b>LEVEL ' + playerLevel() + '</b><span>' + (playerProfile.xp % XP_PER_LEVEL) + ' / ' + XP_PER_LEVEL + ' XP TO NEXT LEVEL</span></div><div class="xp-track"><span style="width:' + (playerProfile.xp % XP_PER_LEVEL / XP_PER_LEVEL * 100) + '%"></span></div></div>';
  if (!raceBest || wpm > raceBest.wpm) {
    raceBest = {wpm,accuracy};
    localStorage.setItem('rsa-code-best',JSON.stringify(raceBest));
  } else if (accuracy > raceBest.accuracy) {
    raceBest.accuracy = accuracy;
    localStorage.setItem('rsa-code-best',JSON.stringify(raceBest));
  }
  renderCodeRecord();
  renderRaceTrack();
  raceResult.classList.remove('hidden');
  raceResult.innerHTML = '<h3>' + place + '</h3><p>Typing speed: <strong>' + wpm.toFixed(1) + ' WPM</strong></p><p>Accuracy: <strong>' + accuracy.toFixed(1) + '%</strong></p><div class="reward-summary race-reward-summary">' + rewardHtml + '</div><button class="start-button" id="race-again-button" type="button">RACE AGAIN</button>';
  document.getElementById('race-again-button').addEventListener('click',openCodeRace);
  raceHint.textContent = 'Race complete! You can race again with a new code snippet.';
  if (mysteryActive) {
    const again = document.getElementById('race-again-button');
    if (again) again.remove();
    const next = document.createElement('button');
    next.type = 'button';
    next.id = 'mystery-next-button';
    next.className = 'start-button mystery-next-button';
    next.textContent = mysteryRound >= MYSTERY_TOTAL_ROUNDS ? 'CLAIM MYSTERY BONUS' : 'NEXT MYSTERY';
    next.addEventListener('click',() => {
      next.remove();
      if (mysteryRound >= MYSTERY_TOTAL_ROUNDS) {
        const bonus = 75;
        const unlocked = awardXP(bonus);
        raceResult.insertAdjacentHTML('beforeend','<p class="reward-detail">MYSTERY MASTER! +'+bonus+' bonus XP for completing all five surprise rounds.</p>');
        raceResult.insertAdjacentHTML('beforeend','<button class="back-button" id="mystery-return-button" type="button">BACK TO ARENA</button>');
        document.getElementById('mystery-return-button').addEventListener('click',() => { mysteryActive=false; showScreen(modeScreen); });
        mysteryActive=false;
      } else startMysteryChallenge();
    });
    raceResult.appendChild(next);
  }
}
function leaveCodeRace() {
  clearInterval(raceTimer);
  raceTimer = null;
  raceStartedAt = 0;
  raceInput.disabled = true;
  raceLanguage.disabled = false;
  showScreen(modeScreen);
}
raceInput.addEventListener('input',handleRaceInput);
raceInput.addEventListener('keydown',event => {
  if (!raceStartedAt || raceFinished) return;
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = raceInput.selectionStart, end = raceInput.selectionEnd;
    raceInput.setRangeText('    ',start,end,'end');
    raceInput.dispatchEvent(new Event('input',{bubbles:true}));
  } else if (event.key === 'Enter') {
    // Add the indentation of the current line automatically.
    event.preventDefault();
    const before = raceInput.value.slice(0,raceInput.selectionStart);
    const line = before.slice(before.lastIndexOf('\n')+1);
    const indent = (line.match(/^\s*/) || [''])[0];
    const start = raceInput.selectionStart, end = raceInput.selectionEnd;
    raceInput.setRangeText('\n'+indent,start,end,'end');
    raceInput.dispatchEvent(new Event('input',{bubbles:true}));
  }
});
document.getElementById('code-mode-button').addEventListener('click',openCodeRace);
document.getElementById('mystery-mode-button').addEventListener('click',beginMysteryMode);
document.getElementById('race-home-button').addEventListener('click',leaveCodeRace);
document.getElementById('race-leave-button').addEventListener('click',leaveCodeRace);
raceStartButton.addEventListener('click',startCodeRace);
renderCodeRecord();
renderProfile();


// Rotating arena messages make the mode screen feel alive.
const arenaMessages = [
  'Your next record is waiting. Choose a mode and make it yours.',
  'Quick reflexes. Sharp focus. One arena champion.',
  'Challenge your friends, beat your best, and climb higher.',
  'Every millisecond counts. Are you ready to compete?',
  'Four challenges. One question: how fast are you?'
];
let arenaMessageIndex = 0;
const arenaMessage = document.getElementById('arena-challenge-text');
if (arenaMessage) {
  setInterval(() => {
    arenaMessage.style.opacity = '0';
    setTimeout(() => {
      arenaMessageIndex = (arenaMessageIndex + 1) % arenaMessages.length;
      arenaMessage.textContent = arenaMessages[arenaMessageIndex];
      arenaMessage.style.opacity = '1';
    }, 220);
  }, 4200);
}


// Sound effects (generated locally with Web Audio; no external audio files).
let soundMuted = localStorage.getItem('rsa-sound-muted') === 'true';
let soundContext = null;
function updateSoundToggle() {
  const toggle = document.getElementById('sound-toggle');
  if (!toggle) return;
  toggle.textContent = soundMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
  toggle.setAttribute('aria-pressed', String(soundMuted));
}
function playSound(kind) {
  if (soundMuted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    soundContext = soundContext || new AudioCtx();
    if (soundContext.state === 'suspended') soundContext.resume();
    const now = soundContext.currentTime;

    // A bright, rising three-note chime for correct answers.
    // A short, descending buzzer for incorrect answers.
    const patterns = {
      success: { notes:[{hz:587,at:0,duration:.16,wave:'sine'},{hz:740,at:.09,duration:.18,wave:'sine'},{hz:988,at:.19,duration:.27,wave:'triangle'}], volume:.105 },
      error: { notes:[{hz:220,at:0,duration:.2,wave:'sawtooth'},{hz:155,at:.12,duration:.26,wave:'triangle'}], volume:.075 },
      go: { notes:[{hz:520,at:0,duration:.13,wave:'sine'},{hz:760,at:.09,duration:.16,wave:'sine'}], volume:.09 },
      finish: { notes:[{hz:523,at:0,duration:.16,wave:'sine'},{hz:659,at:.1,duration:.16,wave:'sine'},{hz:784,at:.2,duration:.16,wave:'sine'},{hz:1047,at:.3,duration:.3,wave:'triangle'}], volume:.1 },
      click: { notes:[{hz:420,at:0,duration:.07,wave:'sine'}], volume:.055 }
    };
    const pattern = patterns[kind] || patterns.click;
    pattern.notes.forEach(note => {
      const osc = soundContext.createOscillator();
      const gain = soundContext.createGain();
      const begin = now + note.at;
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.hz,begin);
      gain.gain.setValueAtTime(.0001,begin);
      gain.gain.exponentialRampToValueAtTime(pattern.volume,begin+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,begin+note.duration);
      osc.connect(gain);
      gain.connect(soundContext.destination);
      osc.start(begin);
      osc.stop(begin+note.duration+.01);
    });
  } catch (error) { /* Audio is optional; gameplay continues without it. */ }
}
document.getElementById('sound-toggle').addEventListener('click',() => {
  soundMuted = !soundMuted;
  localStorage.setItem('rsa-sound-muted',String(soundMuted));
  updateSoundToggle();
  if (!soundMuted) playSound('success');
});
updateSoundToggle();

// Click Speed: a moving target and a golden bonus target (+10 clicks).
let clickTargetMoveTimer = null;
let goldenSpawnTimer = null;
function setupClickTargets() {
  reactionBox.querySelectorAll('.moving-click-target,.golden-powerup').forEach(node => node.remove());
  const target = document.createElement('button');
  target.type = 'button'; target.className = 'moving-click-target'; target.textContent = 'CLICK!';
  target.setAttribute('aria-label','Moving click target');
  target.addEventListener('click',event => {
    event.stopPropagation();
    if (roundState !== 'clicking') return;
    countBonusClicks(1,event);
    moveClickTargets();
  });
  const gold = document.createElement('button');
  gold.type = 'button'; gold.className = 'golden-powerup'; gold.textContent = '★';
  gold.setAttribute('aria-label','Golden power-up: add ten clicks');
  gold.addEventListener('click',event => {
    event.stopPropagation();
    if (roundState !== 'clicking') return;
    countBonusClicks(10,event);
    gold.style.display = 'none';
    playSound('finish');
    clearTimeout(goldenSpawnTimer);
    goldenSpawnTimer = setTimeout(() => { if (roundState === 'clicking') gold.style.display = 'grid'; },2600);
  });
  reactionBox.append(target,gold);
  moveClickTargets();
}
function moveClickTargets() {
  const target = reactionBox.querySelector('.moving-click-target');
  const gold = reactionBox.querySelector('.golden-powerup');
  if (!target || !gold) return;
  const maxX = Math.max(8,reactionBox.clientWidth-78), maxY = Math.max(8,reactionBox.clientHeight-78);
  target.style.left = (12 + Math.random()*Math.max(0,maxX-12))+'px';
  target.style.top = (12 + Math.random()*Math.max(0,maxY-12))+'px';
  gold.style.left = Math.max(10,reactionBox.clientWidth-68)+'px';
  gold.style.top = '12px';
}
function countBonusClicks(amount,event) {
  clickCount += amount;
  reactionMessage.textContent = clickCount + ' CLICKS!';
  reactionMessage.classList.remove('click-counter-pop'); void reactionMessage.offsetWidth; reactionMessage.classList.add('click-counter-pop');
  const burst = document.createElement('span'); burst.className='click-float'; burst.textContent='+'+amount;
  const rect=reactionBox.getBoundingClientRect();
  burst.style.left=Math.max(10,Math.min(rect.width-48,event.clientX-rect.left-12))+'px';
  burst.style.top=Math.max(10,Math.min(rect.height-34,event.clientY-rect.top-8))+'px';
  reactionBox.appendChild(burst); burst.addEventListener('animationend',()=>burst.remove(),{once:true});
  playSound('click');
}
const originalFinishClickTest = finishClickTest;
