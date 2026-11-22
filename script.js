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
const profileScreen = document.getElementById('profile-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const customizeScreen = document.getElementById('customize-screen');
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
  const previousStreak = comboStreaks[activeMode];
  if (passed) comboStreaks[activeMode]++;
  else comboStreaks[activeMode] = 0;
  const streakNow = comboStreaks[activeMode];
  if (passed && streakNow >= 2) {
    playSound('combo', streakNow);
    if (streakNow === 3) { shakeScreen('sm'); popText('🔥 3x COMBO!'); }
    else if (streakNow === 5 || (streakNow >= 10 && streakNow % 5 === 0)) { shakeScreen('lg'); launchConfetti(60 + Math.min(streakNow, 20) * 5); popText('⚡ ' + streakNow + 'x COMBO!'); }
  } else if (!passed && previousStreak >= 3) {
    shakeScreen('sm');
    popText('💥 COMBO LOST');
  }
  updateCombo(!passed ? 'COMBO RESET — TRY AGAIN!' : comboStreaks[activeMode] >= 2 ? '🔥 ' + comboStreaks[activeMode] + 'x COMBO!' : 'NICE! KEEP GOING!');
}

const XP_PER_LEVEL = 250;
const ARENA_CHARACTERS = {
  nova:{unlock:1,name:'NOVA',role:'THE ALL-ROUNDER',female:false,skin:'#e6b794',hair:'#4b3425',iris:'#4f86c6',cape:'#2f6aa3',suit:'#1b2230',accent:'#5a9bd4',trim:'#9cc6ec',style:'swept'},
  kai:{unlock:1,name:'KAI',role:'THE SPEEDSTER',female:false,skin:'#8c5b40',hair:'#14161d',iris:'#3a281d',cape:'#a42b47',suit:'#1d1a26',accent:'#c24560',trim:'#f0a0b0',style:'crop'},
  zara:{unlock:1,name:'ZARA',role:'THE STRATEGIST',female:true,skin:'#e3ab8c',hair:'#c4622f',iris:'#4c8a68',cape:'#b3382b',suit:'#1b2030',accent:'#d95a3e',trim:'#f4b58a',style:'pixie'},
  axel:{unlock:1,name:'AXEL',role:'THE CODE RUNNER',female:false,skin:'#f0c9a7',hair:'#1c1e27',iris:'#6c7f93',cape:'#323a49',suit:'#151922',accent:'#8697ad',trim:'#c4d2e4',style:'hood'},
  luna:{unlock:1,name:'LUNA',role:'THE NIGHT PLAYER',female:true,skin:'#8b5a42',hair:'#15121a',iris:'#3d2a1f',cape:'#1f8f96',suit:'#16222a',accent:'#2fb6bd',trim:'#e0b765',style:'bob'},
  jett:{unlock:1,name:'JETT',role:'THE CHALLENGER',female:false,skin:'#6a4231',hair:'#16120f',iris:'#2e1d14',cape:'#b9822f',suit:'#1e1a17',accent:'#d6a043',trim:'#f4d48f',style:'locs'},
  rex:{unlock:3,name:'REX',role:'THE TRAILBLAZER',female:false,skin:'#c68a5e',hair:'#c9d3e0',iris:'#2fa07a',cape:'#2f9a62',suit:'#14211c',accent:'#43c98a',trim:'#b8f5d6',style:'mohawk'},
  mira:{unlock:5,name:'MIRA',role:'THE MYSTIC',female:true,skin:'#f2d3b8',hair:'#d9d2f2',iris:'#9a62e0',cape:'#7a4bd0',suit:'#1a1630',accent:'#a98aff',trim:'#e4d6ff',style:'long'},
  sol:{unlock:8,name:'SOL',role:'THE LEGEND',female:false,skin:'#4a2f24',hair:'#14161d',iris:'#d9a52a',cape:'#c78a24',suit:'#241a0e',accent:'#ffc94d',trim:'#fff0b8',style:'afro'},
  nyx:{unlock:12,name:'NYX',role:'THE SHADOW',female:true,skin:'#d69b79',hair:'#ff6fb0',iris:'#d8303f',cape:'#2a2f3c',suit:'#101218',accent:'#ff4f93',trim:'#ffc2dc',style:'spiky'}
};
let arenaArtCounter = 0;
const CUSTOM_SKINS = [
  {id:'porcelain',name:'Porcelain',color:'#f2d3b8',lvl:1},{id:'fair',name:'Fair',color:'#e6b794',lvl:1},{id:'sand',name:'Sand',color:'#d69b79',lvl:1},
  {id:'golden',name:'Golden',color:'#c68a5e',lvl:1},{id:'bronze',name:'Bronze',color:'#8c5b40',lvl:1},{id:'mocha',name:'Mocha',color:'#6a4231',lvl:1},{id:'deep',name:'Deep',color:'#4a2f24',lvl:1}
];
const CUSTOM_HAIR_STYLES = [
  {id:'swept',name:'Swept',lvl:1},{id:'crop',name:'Crop',lvl:1},{id:'pixie',name:'Pixie',lvl:1},{id:'bob',name:'Bob',lvl:1},{id:'locs',name:'Locs',lvl:2},
  {id:'hood',name:'Hooded',lvl:2},{id:'spiky',name:'Spiky',lvl:3},{id:'long',name:'Long',lvl:4},{id:'afro',name:'Afro',lvl:6},{id:'mohawk',name:'Mohawk',lvl:8}
];
const CUSTOM_HAIR_COLORS = [
  {id:'black',name:'Black',color:'#14161d',lvl:1},{id:'brown',name:'Brown',color:'#4b3425',lvl:1},{id:'chestnut',name:'Chestnut',color:'#7a4a2a',lvl:1},{id:'auburn',name:'Auburn',color:'#c4622f',lvl:1},
  {id:'blonde',name:'Blonde',color:'#d9b45a',lvl:1},{id:'silver',name:'Silver',color:'#c9d3e0',lvl:2},{id:'ice',name:'Ice Blue',color:'#5ab4ff',lvl:4},{id:'violet',name:'Violet',color:'#8a5be0',lvl:5},
  {id:'pink',name:'Hot Pink',color:'#ff6fb0',lvl:6},{id:'crimson',name:'Crimson',color:'#d8303f',lvl:7},{id:'neon',name:'Neon Green',color:'#43e08a',lvl:9}
];
const CUSTOM_EYES = [
  {id:'brown',name:'Brown',color:'#3a281d',lvl:1},{id:'hazel',name:'Hazel',color:'#7a5a2a',lvl:1},{id:'green',name:'Green',color:'#4c8a68',lvl:1},{id:'blue',name:'Blue',color:'#4f86c6',lvl:1},
  {id:'gray',name:'Gray',color:'#6c7f93',lvl:1},{id:'violet',name:'Violet',color:'#9a62e0',lvl:3},{id:'gold',name:'Gold',color:'#d9a52a',lvl:5},{id:'cyan',name:'Cyan',color:'#2fd0e0',lvl:7},{id:'red',name:'Ruby',color:'#d8303f',lvl:9}
];
const CUSTOM_OUTFITS = [
  {id:'steel',name:'Steel Blue',cape:'#2f6aa3',accent:'#5a9bd4',trim:'#9cc6ec',suit:'#1b2230',lvl:1},
  {id:'crimson',name:'Crimson',cape:'#a42b47',accent:'#c24560',trim:'#f0a0b0',suit:'#1d1a26',lvl:1},
  {id:'teal',name:'Teal',cape:'#1f8f96',accent:'#2fb6bd',trim:'#e0b765',suit:'#16222a',lvl:1},
  {id:'emerald',name:'Emerald',cape:'#2f9a62',accent:'#43c98a',trim:'#b8f5d6',suit:'#14211c',lvl:1},
  {id:'midnight',name:'Midnight',cape:'#323a49',accent:'#8697ad',trim:'#c4d2e4',suit:'#151922',lvl:2},
  {id:'amethyst',name:'Amethyst',cape:'#7a4bd0',accent:'#a98aff',trim:'#e4d6ff',suit:'#1a1630',lvl:2},
  {id:'sunset',name:'Sunset',cape:'#d9692a',accent:'#ff9a4d',trim:'#ffd9a8',suit:'#241710',lvl:3},
  {id:'gold',name:'Golden',cape:'#b9822f',accent:'#d6a043',trim:'#f4d48f',suit:'#1e1a17',lvl:4},
  {id:'rose',name:'Rose',cape:'#c0407a',accent:'#ff6fb0',trim:'#ffd0e6',suit:'#241322',lvl:5},
  {id:'glacier',name:'Glacier',cape:'#5aa8c8',accent:'#8fe0ff',trim:'#e6fbff',suit:'#12212b',lvl:6},
  {id:'royal',name:'Royal',cape:'#8d1f36',accent:'#e0b24a',trim:'#fff0b8',suit:'#1d1016',lvl:8},
  {id:'cosmic',name:'Cosmic',cape:'#4a3bd0',accent:'#46e6ff',trim:'#c9f7ff',suit:'#0f1030',lvl:10},
  {id:'phoenix',name:'Phoenix',cape:'#e8461f',accent:'#ffd23a',trim:'#fff2b0',suit:'#2a0e08',lvl:1,streak:14},
  {id:'solar',name:'Solar',cape:'#e6a526',accent:'#fff0a0',trim:'#ffffff',suit:'#2a1c08',lvl:12}
];
const CUSTOM_EMBLEMS = [
  {id:'diamond',name:'Diamond',lvl:1},{id:'star',name:'Star',lvl:2},{id:'heart',name:'Heart',lvl:3},{id:'bolt',name:'Bolt',lvl:4},
  {id:'shield',name:'Shield',lvl:5},{id:'flame',name:'Flame',lvl:6},{id:'crown',name:'Crown',lvl:9}
];
const CUSTOM_EXTRAS = [
  {id:'none',name:'None',lvl:1},{id:'headband',name:'Headband',lvl:3},{id:'earring',name:'Earring',lvl:4},{id:'domino',name:'Hero Mask',lvl:5},
  {id:'halo',name:'Halo',lvl:8},{id:'crown',name:'Crown',lvl:10}
];
const CUSTOM_FRAMES = [
  {id:'default',name:'Classic',lvl:1},{id:'gold',name:'Gold',lvl:3},{id:'neon',name:'Neon',lvl:6},{id:'rainbow',name:'Rainbow',lvl:9},{id:'fire',name:'Inferno',lvl:12},{id:'aura',name:'Streak Aura',lvl:1,streak:7}
];
const CUSTOM_CATEGORIES = [
  {key:'skin',label:'SKIN',icon:'🧑',list:CUSTOM_SKINS,swatch:'color'},
  {key:'style',label:'HAIR',icon:'💇',list:CUSTOM_HAIR_STYLES},
  {key:'hairColor',label:'HAIR COLOR',icon:'🎨',list:CUSTOM_HAIR_COLORS,swatch:'color'},
  {key:'eyes',label:'EYES',icon:'👁️',list:CUSTOM_EYES,swatch:'color'},
  {key:'outfit',label:'HERO SUIT',icon:'🦸',list:CUSTOM_OUTFITS},
  {key:'emblem',label:'EMBLEM',icon:'⭐',list:CUSTOM_EMBLEMS},
  {key:'accessory',label:'EXTRAS',icon:'👑',list:CUSTOM_EXTRAS},
  {key:'frame',label:'FRAME',icon:'💠',list:CUSTOM_FRAMES}
];
function resolveArenaLook(characterId, custom) {
  const base = ARENA_CHARACTERS[characterId] || ARENA_CHARACTERS.nova;
  const look = Object.assign({}, base);
  const choice = custom && typeof custom === 'object' ? custom : {};
  const find = (list, id) => list.find(item => item.id === id);
  const skin = find(CUSTOM_SKINS, choice.skin); if (skin) look.skin = skin.color;
  const style = find(CUSTOM_HAIR_STYLES, choice.style); if (style) look.style = style.id;
  const hairColor = find(CUSTOM_HAIR_COLORS, choice.hairColor); if (hairColor) look.hair = hairColor.color;
  const eyes = find(CUSTOM_EYES, choice.eyes); if (eyes) look.iris = eyes.color;
  const outfit = find(CUSTOM_OUTFITS, choice.outfit); if (outfit) Object.assign(look, {cape:outfit.cape, accent:outfit.accent, trim:outfit.trim, suit:outfit.suit});
  look.emblem = find(CUSTOM_EMBLEMS, choice.emblem) ? choice.emblem : 'diamond';
  look.accessory = find(CUSTOM_EXTRAS, choice.accessory) ? choice.accessory : 'none';
  look.frame = find(CUSTOM_FRAMES, choice.frame) ? choice.frame : 'default';
  return look;
}
function sanitizeCustom(custom) {
  const clean = {};
  if (!custom || typeof custom !== 'object') return clean;
  Object.keys(custom).forEach(characterId => {
    if (!ARENA_CHARACTERS[characterId] || !custom[characterId] || typeof custom[characterId] !== 'object') return;
    const entry = {};
    CUSTOM_CATEGORIES.forEach(category => { if (category.list.some(item => item.id === custom[characterId][category.key])) entry[category.key] = custom[characterId][category.key]; });
    clean[characterId] = entry;
  });
  return clean;
}
function arenaEmblem(look) {
  const fill = look.trim, dark = arenaShade(look.accent, -.45);
  const shapes = {
    diamond:'<path d="M60 105 L67 113 L60 121 L53 113Z" fill="' + fill + '" opacity=".92"/><path d="M60 108 L64 113 L60 118 L56 113Z" fill="' + dark + '"/>',
    star:'<path d="M60 104 L62.8 110.6 L70 111.2 L64.5 115.8 L66.2 122.8 L60 119 L53.8 122.8 L55.5 115.8 L50 111.2 L57.2 110.6Z" fill="' + fill + '" opacity=".95"/>',
    heart:'<path d="M60 122 C47 113 51 104 56.5 105.6 C58.6 106.3 60 108 60 109.4 C60 108 61.4 106.3 63.5 105.6 C69 104 73 113 60 122Z" fill="' + fill + '" opacity=".95"/>',
    bolt:'<path d="M63 103 L53.5 114.4 L59 114.4 L56.6 123 L67 111 L61.2 111Z" fill="' + fill + '" opacity=".95"/>',
    shield:'<path d="M60 104 L68.5 107.4 L67.4 116 Q60 124 52.6 116 L51.5 107.4Z" fill="' + fill + '" opacity=".92"/><path d="M60 108 L65 110 L64.4 115 Q60 119.6 55.6 115 L55 110Z" fill="' + dark + '"/>',
    flame:'<path d="M60 103 C63 108 69 111 67.4 117 C66.4 121.4 63.2 123 60 123 C56.4 123 53.4 120.6 53.8 116.4 C54 113.4 57 111.8 57.8 108.6 C58.8 110.6 59.6 110.2 60 103Z" fill="' + fill + '" opacity=".95"/><path d="M60 112 C62 115 63.6 116 62.6 119 C62 120.6 61 121 60 121 C58.8 121 57.8 120 58 118.6 C58.2 116.6 59.6 116 60 112Z" fill="' + dark + '"/>',
    crown:'<path d="M51.5 119 L51.5 108 L55.8 112 L60 105 L64.2 112 L68.5 108 L68.5 119Z" fill="' + fill + '" opacity=".95"/><rect x="51.5" y="119" width="17" height="2.6" rx="1" fill="' + dark + '"/>'
  };
  return '<g transform="translate(60 109.4) scale(.72) translate(-60 -113)">' + (shapes[look.emblem] || shapes.diamond) + '</g>';
}
function arenaFrame(look, p) {
  const accent = look.accent;
  const spin = (dur) => '<animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="' + dur + 's" repeatCount="indefinite"/>';
  if (look.frame === 'gold') return '<circle cx="60" cy="60" r="56" fill="none" stroke="url(#' + p + 'fgold)" stroke-width="3.6"/><circle cx="60" cy="60" r="52.6" fill="none" stroke="#fff3b8" stroke-opacity=".5" stroke-width=".8"/>';
  if (look.frame === 'neon') return '<circle cx="60" cy="60" r="56" fill="none" stroke="#3df0ff" stroke-width="2.4" filter="url(#' + p + 'glowf)"/><circle cx="60" cy="60" r="52.6" fill="none" stroke="#ff4fd8" stroke-width="1.6" stroke-dasharray="6 5" opacity=".9">' + spin(14) + '</circle>';
  if (look.frame === 'rainbow') return '<circle cx="60" cy="60" r="56" fill="none" stroke="url(#' + p + 'frainbow)" stroke-width="3.8"/><circle cx="60" cy="60" r="52.4" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="2 5">' + spin(18) + '</circle>';
  if (look.frame === 'aura') return '<circle cx="60" cy="60" r="56" fill="none" stroke="url(#' + p + 'ffire)" stroke-width="3.4" filter="url(#' + p + 'glowf)"/><circle cx="60" cy="60" r="52.4" fill="none" stroke="#fff3b8" stroke-width="1.6" stroke-dasharray="1 6" stroke-linecap="round">' + spin(10) + '</circle><circle cx="60" cy="60" r="58.6" fill="none" stroke="#ffb347" stroke-opacity=".5" stroke-width="1.4"><animate attributeName="stroke-opacity" values=".15;.7;.15" dur="2.4s" repeatCount="indefinite"/></circle>';
  if (look.frame === 'fire') return '<circle cx="60" cy="60" r="56" fill="none" stroke="url(#' + p + 'ffire)" stroke-width="4" filter="url(#' + p + 'glowf)"/><circle cx="60" cy="60" r="52.4" fill="none" stroke="#ffd36a" stroke-width="1.8" stroke-dasharray="3 6" stroke-linecap="round">' + spin(8) + '</circle>';
  return '<circle cx="60" cy="60" r="57" fill="none" stroke="' + accent + '" stroke-opacity=".75" stroke-width="2"/>';
}
function arenaAccessoryBack(look) {
  if (look.accessory === 'domino') return '<path d="M37.5 55.5 Q49 49 60 56 Q71 49 82.5 55.5 Q83.5 66.6 72.5 66.6 Q65.5 66.6 60 61 Q54.5 66.6 47.5 66.6 Q36.5 66.6 37.5 55.5Z" fill="#12151f" opacity=".93"/><path d="M37.5 55.5 Q49 49 60 56 Q71 49 82.5 55.5" fill="none" stroke="' + look.accent + '" stroke-width=".9" opacity=".8"/>';
  return '';
}
function arenaAccessoryFront(look) {
  if (look.accessory === 'headband') return '<path d="M33.6 48 Q60 36.6 86.4 48 L86.2 53 Q60 42 33.8 53Z" fill="' + look.accent + '"/><path d="M33.6 48 Q60 36.6 86.4 48" fill="none" stroke="' + look.trim + '" stroke-opacity=".7" stroke-width=".8"/><circle cx="60" cy="42.6" r="3" fill="' + look.trim + '"/>';
  if (look.accessory === 'earring') return '<circle cx="34.4" cy="68" r="2.3" fill="none" stroke="' + look.trim + '" stroke-width="1.3"/><circle cx="34.4" cy="71" r="1.8" fill="' + look.trim + '"/>';
  if (look.accessory === 'halo') return '<ellipse cx="60" cy="17" rx="22" ry="5.4" fill="none" stroke="#ffe27a" stroke-width="2.6"/><ellipse cx="60" cy="17" rx="22" ry="5.4" fill="none" stroke="#fff8d0" stroke-width=".9" opacity=".9"/>';
  if (look.accessory === 'crown') return '<path d="M41 31 L43 16 L51.5 24 L60 11 L68.5 24 L77 16 L79 31Z" fill="#e8b93e" stroke="#fff0b0" stroke-width=".9"/><circle cx="60" cy="19" r="2.2" fill="#ff5a7a"/><circle cx="47" cy="24" r="1.5" fill="#6ae0ff"/><circle cx="73" cy="24" r="1.5" fill="#6ae0ff"/>';
  return '';
}
function arenaShade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const mix = Math.abs(amount);
  const channel = shift => Math.round(((value >> shift) & 255) * (1 - mix) + target * mix);
  return '#' + [16, 8, 0].map(shift => channel(shift).toString(16).padStart(2, '0')).join('');
}
function arenaHair(character) {
  const hair = character.hair, light = arenaShade(hair, .28);
  const shine = d => '<path d="' + d + '" fill="none" stroke="' + light + '" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>';
  const cap = d => '<path d="' + d + '" fill="' + hair + '"/>';
  if (character.style === 'spiky') return {
    back: '',
    front: cap('M33 58 Q29 32 37 28 L39 14 L47 26 L53 9 L60 25 L67 9 L73 26 L81 14 L83 28 Q91 32 87 58 Q85 43 77 39 Q60 34 43 39 Q35 43 33 58Z') + shine('M44 34 Q60 28 76 34')
  };
  if (character.style === 'long') return {
    back: cap('M27 104 Q15 24 60 17 Q105 24 93 104 L84 108 Q80 72 85 52 L35 52 Q40 72 36 108Z'),
    front: cap('M34 62 Q27 26 60 20 Q93 26 86 62 Q85 43 72 38 Q64 45 60 36 Q56 45 48 38 Q35 43 34 62Z') + shine('M42 31 Q60 23 78 31 M33 70 Q28 52 33 40')
  };
  if (character.style === 'afro') return {
    back: '<ellipse cx="60" cy="40" rx="37" ry="31" fill="' + hair + '"/><circle cx="30" cy="46" r="9" fill="' + hair + '"/><circle cx="90" cy="46" r="9" fill="' + hair + '"/>',
    front: cap('M35 57 Q33 34 60 31 Q87 34 85 57 Q81 43 60 40 Q39 43 35 57Z') + shine('M42 22 Q60 13 78 22 M32 38 Q30 30 38 24')
  };
  if (character.style === 'mohawk') return {
    back: '',
    front: '<path d="M36 56 Q34 36 60 32 Q86 36 84 56 Q82 44 60 40 Q38 44 36 56Z" fill="' + hair + '" opacity=".4"/>' + cap('M51 42 Q47 18 60 6 Q73 18 69 42 Q60 36 51 42Z') + shine('M56 28 Q60 14 64 28')
  };
  if (character.style === 'swept') return {
    back: '',
    front: cap('M34 63 Q24 25 59 20 Q92 20 87 58 Q86 43 78 38 Q70 42 62 37 Q52 44 40 42 Q36 50 36 64Z') + shine('M45 33 Q60 25 78 34 M50 38 Q62 32 76 40')
  };
  if (character.style === 'crop') return {
    back: '',
    front: cap('M35 57 Q30 27 60 24 Q90 27 85 57 Q84 43 76 39 Q60 34 44 39 Q36 44 35 57Z') + shine('M44 32 Q60 26 76 33')
  };
  if (character.style === 'pixie') return {
    back: cap('M33 70 Q26 26 60 21 Q94 26 87 70 Q84 56 84 50 L36 50 Q36 56 33 70Z'),
    front: cap('M33 66 Q26 25 60 20 Q94 25 87 66 Q87 48 78 40 Q70 46 58 38 Q47 48 41 58 Q38 52 36 56Z') + shine('M42 30 Q60 22 80 32 M46 38 Q56 32 70 38')
  };
  if (character.style === 'hood') return {
    back: '<path d="M25 70 Q21 16 60 13 Q99 16 95 70 L100 112 L20 112Z" fill="' + character.cape + '"/><path d="M33 66 Q31 28 60 25 Q89 28 87 66 Q80 38 60 36 Q40 38 33 66Z" fill="#0b0d13" opacity=".55"/>',
    front: cap('M36 52 Q36 31 60 29 Q84 31 84 52 Q80 42 72 40 Q60 36 48 40 Q40 42 36 52Z') + shine('M46 35 Q60 30 74 35')
  };
  if (character.style === 'bob') return {
    back: cap('M30 96 Q22 24 60 19 Q98 24 90 96 Q82 100 80 84 L80 54 L40 54 L40 84 Q38 100 30 96Z'),
    front: cap('M34 68 Q26 24 60 20 Q94 24 86 68 Q86 46 74 38 Q62 46 48 42 Q38 48 36 62Z') + shine('M42 30 Q60 22 80 31 M33 70 Q30 52 34 40')
  };
  const strand = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" fill="' + hair + '"/>';
  return {
    back: strand(26, 46, 8, 52) + strand(34, 54, 8, 50) + strand(78, 54, 8, 50) + strand(86, 46, 8, 52) + strand(31, 50, 7, 56) + strand(82, 50, 7, 56),
    front: cap('M34 58 Q28 26 60 21 Q92 26 86 58 Q84 42 76 38 Q60 33 44 38 Q36 43 34 58Z') +
      '<circle cx="60" cy="19" r="9" fill="' + hair + '"/><circle cx="46" cy="26" r="6" fill="' + hair + '"/><circle cx="74" cy="26" r="6" fill="' + hair + '"/>' +
      shine('M44 33 Q60 26 76 33 M55 17 Q60 14 65 17')
  };
}
function arenaEye(cx, character) {
  const brow = arenaShade(character.hair, character.style === 'locs' ? 0 : -.05);
  const side = cx < 60 ? -1 : 1;
  const lid = character.female ? 1.6 : 1.3;
  return '<path d="M' + (cx - 6 * side) + ' 53.8 Q' + cx + ' 50.8 ' + (cx + 6 * side) + ' 52.6" fill="none" stroke="' + brow + '" stroke-width="' + (character.female ? 1.6 : 2) + '" stroke-linecap="round" opacity=".92"/>' +
    '<path d="M' + (cx - 6.2) + ' 60 Q' + cx + ' 54.6 ' + (cx + 6.2) + ' 60 Q' + cx + ' 65.4 ' + (cx - 6.2) + ' 60Z" fill="#fbf8f5"/>' +
    '<circle cx="' + cx + '" cy="60.2" r="3.7" fill="' + character.iris + '"/><circle cx="' + cx + '" cy="60.2" r="3.7" fill="none" stroke="' + arenaShade(character.iris, -.45) + '" stroke-width=".7"/>' +
    '<circle cx="' + cx + '" cy="60.2" r="1.8" fill="#080b12"/><circle cx="' + (cx - 1.3) + '" cy="58.8" r="1.15" fill="#fff"/><circle cx="' + (cx + 1.3) + '" cy="61.6" r=".5" fill="#fff" opacity=".8"/>' +
    '<path d="M' + (cx - 6.5) + ' 60.2 Q' + cx + ' 54 ' + (cx + 6.5) + ' 60.2" fill="none" stroke="#1b1a24" stroke-width="' + lid + '" stroke-linecap="round"/>' +
    (character.female ? '<path d="M' + (cx + 6.2 * side) + ' 59.8 L' + (cx + 8 * side) + ' 58.2" stroke="#1b1a24" stroke-width="1.1" stroke-linecap="round"/>' : '');
}
function arenaCharacterArt(characterId, custom) {
  const id = ARENA_CHARACTERS[characterId] ? characterId : 'nova';
  const c = resolveArenaLook(id, custom), p = 'ac-' + id + '-' + (++arenaArtCounter) + '-';
  const hair = arenaHair(c);
  const skinDark = arenaShade(c.skin, -.28), skinLight = arenaShade(c.skin, .2);
  const lips = arenaShade(c.skin, c.female ? -.24 : -.2), capeDark = arenaShade(c.cape, -.45), capeLight = arenaShade(c.cape, .18);
  const face = 'M34 54 Q34 31 60 30 Q86 31 86 54 L85 66 Q82 87 60 92 Q38 87 35 66Z';
  return '<svg class="arena-character-art" viewBox="0 0 120 120" role="img" aria-label="' + c.name + ' character portrait">' +
    '<defs>' +
    '<clipPath id="' + p + 'clip"><circle cx="60" cy="60" r="57"/></clipPath>' +
    '<radialGradient id="' + p + 'bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a3a5c"/><stop offset="1" stop-color="#0b1020"/></radialGradient>' +
    '<linearGradient id="' + p + 'skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + skinLight + '"/><stop offset=".55" stop-color="' + c.skin + '"/><stop offset="1" stop-color="' + skinDark + '"/></linearGradient>' +
    '<linearGradient id="' + p + 'shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>' +
    '<linearGradient id="' + p + 'cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + capeLight + '"/><stop offset="1" stop-color="' + capeDark + '"/></linearGradient>' +
    '<linearGradient id="' + p + 'suit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + arenaShade(c.suit, .22) + '"/><stop offset="1" stop-color="' + arenaShade(c.suit, -.5) + '"/></linearGradient>' +
    '<linearGradient id="' + p + 'plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + arenaShade(c.accent, .15) + '"/><stop offset="1" stop-color="' + arenaShade(c.accent, -.5) + '"/></linearGradient>' +
    '<linearGradient id="' + p + 'fgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".5" stop-color="#d9a52a"/><stop offset="1" stop-color="#fff3b8"/></linearGradient>' +
    '<linearGradient id="' + p + 'frainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a7a"/><stop offset=".25" stop-color="#ffd24a"/><stop offset=".5" stop-color="#5aff9a"/><stop offset=".75" stop-color="#4ab8ff"/><stop offset="1" stop-color="#b06aff"/></linearGradient>' +
    '<linearGradient id="' + p + 'ffire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".6" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>' +
    '<filter id="' + p + 'glowf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '</defs>' +
    '<g clip-path="url(#' + p + 'clip)">' +
    '<rect width="120" height="120" fill="url(#' + p + 'bg)"/>' +
    hair.back +
    '<path d="M0 120 Q2 86 34 80 L86 80 Q118 86 120 120Z" fill="url(#' + p + 'cape)"/>' +
    '<path d="M10 120 Q13 98 38 93 L50 99 L70 99 L82 93 Q107 98 110 120Z" fill="url(#' + p + 'suit)"/>' +
    '<path d="M14 112 Q17 96 36 92 L42 100 Q28 101 24 114Z M106 112 Q103 96 84 92 L78 100 Q92 101 96 114Z" fill="url(#' + p + 'plate)" stroke="' + c.trim + '" stroke-opacity=".6" stroke-width=".8"/>' +
    '<path d="M44 102 L76 102 L84 120 L36 120Z" fill="url(#' + p + 'plate)" stroke="' + c.trim + '" stroke-opacity=".7" stroke-width=".9"/>' +
    arenaEmblem(c) +
    '<path d="M50 84 L50 101 Q60 108 70 101 L70 84Z" fill="url(#' + p + 'skin)"/><path d="M50 84 L50 101 Q60 108 70 101 L70 84Z" fill="url(#' + p + 'shade)"/>' +
    '<path d="M49 85 Q60 97 71 85 Q60 92 49 85Z" fill="#000" opacity=".3"/>' +
    '<path d="M28 100 Q23 76 35 66 Q45 68 51 79 L53 104Z" fill="url(#' + p + 'cape)" stroke="' + c.trim + '" stroke-opacity=".55" stroke-width=".9"/>' +
    '<path d="M92 100 Q97 76 85 66 Q75 68 69 79 L67 104Z" fill="url(#' + p + 'cape)" stroke="' + c.trim + '" stroke-opacity=".55" stroke-width=".9"/>' +
    '<path d="M34 90 Q36 76 41 71 M86 90 Q84 76 79 71" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>' +
    '<ellipse cx="35" cy="60" rx="3.4" ry="6" fill="' + c.skin + '"/><ellipse cx="85" cy="60" rx="3.4" ry="6" fill="' + skinDark + '"/>' +
    '<path d="' + face + '" fill="url(#' + p + 'skin)"/>' +
    '<path d="' + face + '" fill="url(#' + p + 'shade)"/>' +
    '<circle cx="44" cy="71" r="6.5" fill="#ff8a8a" opacity="' + (c.female ? '.06' : '.04') + '"/><circle cx="76" cy="71" r="6.5" fill="#ff8a8a" opacity="' + (c.female ? '.05' : '.03') + '"/>' +
    '<path d="M57.6 74.2 Q60 76.2 62.4 74.2" fill="none" stroke="' + skinDark + '" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M59 67 Q60.6 70 60 72.6" fill="none" stroke="' + skinLight + '" stroke-width="1.6" stroke-linecap="round" opacity=".35"/>' +
    arenaAccessoryBack(c) +
    arenaEye(49, c) + arenaEye(71, c) +
    '<path d="M51.8 80 Q60 84 68.2 80 Q64.6 86.2 60 86.2 Q55.4 86.2 51.8 80Z" fill="' + arenaShade(lips, .08) + '"/>' +
    '<path d="M51.4 79.4 Q55.4 77 58.8 78.2 Q60 77.4 61.2 78.2 Q64.6 77 68.6 79.4 Q60 83.6 51.4 79.4Z" fill="' + lips + '"/>' +
    '<path d="M51.4 79.4 Q55.4 77 58.8 78.2 Q60 77.4 61.2 78.2 Q64.6 77 68.6 79.4 Q60 83.6 51.4 79.4Z M51.8 80 Q60 84 68.2 80 Q64.6 86.2 60 86.2 Q55.4 86.2 51.8 80Z" fill="#e0536c" opacity="' + (c.female ? '.42' : '.3') + '"/>' +
    '<path d="M51 78.8 Q60 85.2 69 78.8" fill="none" stroke="' + arenaShade(lips, -.5) + '" stroke-width="1" stroke-linecap="round"/>' +
    '<path d="M56.4 83.4 Q60 84.6 63.6 83.4" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".3"/>' +
    hair.front +
    arenaAccessoryFront(c) +
    '</g>' +
    arenaFrame(c, p) +
    '</svg>';
}
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
    return {xp:Number.isFinite(saved.xp) ? Math.max(0,saved.xp) : 0,games:Number.isFinite(saved.games) ? saved.games : 0,achievements:Array.isArray(saved.achievements) ? saved.achievements : [],username:typeof saved.username === 'string' ? saved.username.slice(0,16) : 'Arena Player',avatar:typeof saved.avatar === 'string' ? saved.avatar : 'nova',custom:sanitizeCustom(saved.custom),streak:sanitizeStreak(saved.streak)};
  } catch (error) { return {xp:0,games:0,achievements:[],username:'Arena Player',avatar:'nova',custom:{},streak:{count:0,best:0,last:''}}; }
}
const playerProfile = readPlayerProfile();
if (!ARENA_CHARACTERS[playerProfile.avatar]) playerProfile.avatar = 'nova';
let selectedProfileAvatar = playerProfile.avatar;

/* Local player accounts and leaderboard (saved on this device) */
const ACCOUNTS_KEY = 'rsa-accounts';
const SESSION_KEY = 'rsa-session';
function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    return accounts && typeof accounts === 'object' && !Array.isArray(accounts) ? accounts : {};
  } catch (error) { return {}; }
}
function writeAccounts(accounts) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
function currentAccountKey() {
  const key = localStorage.getItem(SESSION_KEY);
  return key && readAccounts()[key] ? key : null;
}
function loadAccountIntoProfile(account) {
  Object.assign(playerProfile, {
    username: String(account.username || 'Player').slice(0,16),
    avatar: ARENA_CHARACTERS[account.avatar] ? account.avatar : 'nova',
    xp: Math.max(0, Number(account.xp) || 0),
    games: Math.max(0, Number(account.games) || 0),
    achievements: Array.isArray(account.achievements) ? account.achievements.slice() : [],
    custom: sanitizeCustom(account.custom),
    streak: sanitizeStreak(account.streak)
  });
  selectedProfileAvatar = playerProfile.avatar;
}
function savePlayerProfile() {
  localStorage.setItem('rsa-player-profile', JSON.stringify(playerProfile));
  const key = currentAccountKey();
  if (!key) return;
  const accounts = readAccounts();
  accounts[key] = {username:accounts[key].username, avatar:playerProfile.avatar, xp:playerProfile.xp, games:playerProfile.games, achievements:playerProfile.achievements.slice(), custom:playerProfile.custom, streak:playerProfile.streak, updated:Date.now()};
  writeAccounts(accounts);
}
(function restoreSession() {
  const key = currentAccountKey();
  if (key) loadAccountIntoProfile(readAccounts()[key]);
})();
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
  renderDetailedProfile();
}
function renderDetailedProfile() {
  const username = playerProfile.username || 'Arena Player';
  const avatar = ARENA_CHARACTERS[selectedProfileAvatar] ? selectedProfileAvatar : 'nova';
  const name = document.getElementById('profile-display-name');
  if (!name) return;
  name.textContent = username;
  document.getElementById('profile-display-avatar').innerHTML = arenaCharacterArt(avatar, playerProfile.custom[avatar]);
  document.getElementById('profile-button-name').textContent = username.toUpperCase();
  document.getElementById('profile-button-avatar').innerHTML = arenaCharacterArt(avatar, playerProfile.custom[avatar]);
  document.getElementById('profile-name-input').value = username;
  renderCharacterPicker();
  const level = playerLevel();
  const inLevel = playerProfile.xp % XP_PER_LEVEL;
  const rank = level >= 10 ? 'ARENA LEGEND' : level >= 7 ? 'SPEED MASTER' : level >= 4 ? 'QUICK THINKER' : 'ROOKIE';
  document.getElementById('profile-rank-detail').textContent = rank;
  document.getElementById('profile-level-detail').textContent = String(level).padStart(2,'0');
  document.getElementById('profile-xp-detail').textContent = playerProfile.xp + ' XP';
  document.getElementById('profile-xp-fill').style.width = (inLevel / XP_PER_LEVEL * 100) + '%';
  document.getElementById('profile-xp-level-label').textContent = 'LEVEL ' + level;
  document.getElementById('profile-xp-next-label').textContent = inLevel + ' / ' + XP_PER_LEVEL + ' XP';
  const colorBest = stats.color.bestMs === null ? '—' : stats.color.bestMs + ' ms';
  const htmlBest = stats.html.bestMs === null ? '—' : (stats.html.bestMs / 1000).toFixed(2) + ' s';
  const clickBest = clickBestCps ? clickBestCps.toFixed(2) : '—';
  const codeRecord = JSON.parse(localStorage.getItem('rsa-code-best') || 'null');
  document.getElementById('profile-color-best').textContent = colorBest;
  document.getElementById('profile-html-best').textContent = htmlBest;
  document.getElementById('profile-click-best').textContent = clickBest;
  document.getElementById('profile-code-best').textContent = codeRecord && codeRecord.wpm ? codeRecord.wpm.toFixed(1) : '—';
  const catalogKeys = Object.keys(achievementCatalog);
  document.getElementById('profile-achievement-count').textContent = playerProfile.achievements.length + ' / ' + catalogKeys.length + ' UNLOCKED';
  document.getElementById('profile-achievements').innerHTML = catalogKeys.map(key => {
    const item = achievementCatalog[key];
    const unlocked = playerProfile.achievements.includes(key);
    return '<div class="profile-achievement ' + (unlocked ? 'unlocked' : 'locked') + '"><span class="profile-achievement-icon">' + (unlocked ? item.icon : '🔒') + '</span><span><strong>' + item.name + '</strong><small>' + item.description + '</small></span><em>' + (unlocked ? 'UNLOCKED' : 'LOCKED') + '</em></div>';
  }).join('');
}
function renderCharacterPicker() {
  const picker = document.getElementById('profile-character-picker');
  if (!picker) return;
  const level = playerLevel();
  picker.innerHTML = Object.entries(ARENA_CHARACTERS).map(([id,character]) => {
    const need = character.unlock || 1, locked = level < need;
    return '<button type="button" class="character-option ' + (id === selectedProfileAvatar ? 'selected ' : '') + (locked ? 'locked' : '') + '" data-character="' + id + '" aria-pressed="' + (id === selectedProfileAvatar) + '"' + (locked ? ' aria-disabled="true" title="Reach level ' + need + ' to unlock"' : '') + '>' +
      '<span class="character-option-art">' + arenaCharacterArt(id, playerProfile.custom[id]) + (locked ? '<span class="lock-badge">🔒 LV ' + need + '</span>' : '') + '</span><strong>' + character.name + '</strong><small>' + (locked ? 'REACH LEVEL ' + need : character.role) + '</small></button>';
  }).join('');
  picker.querySelectorAll('.character-option').forEach(button => {
    button.addEventListener('click', () => {
      const character = ARENA_CHARACTERS[button.dataset.character];
      const need = character.unlock || 1;
      if (playerLevel() < need) {
        const status = document.getElementById('profile-save-status');
        if (status) status.textContent = character.name + ' UNLOCKS AT LEVEL ' + need + ' • ' + Math.max(0, (need - 1) * XP_PER_LEVEL - playerProfile.xp) + ' XP TO GO';
        return;
      }
      selectedProfileAvatar = button.dataset.character;
      document.getElementById('profile-display-avatar').innerHTML = arenaCharacterArt(selectedProfileAvatar, playerProfile.custom[selectedProfileAvatar]);
      document.getElementById('profile-button-avatar').innerHTML = arenaCharacterArt(selectedProfileAvatar, playerProfile.custom[selectedProfileAvatar]);
      renderCharacterPicker();
    });
  });
}
function awardXP(amount, achievementKeys=[]) {
  const levelBefore = playerLevel();
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
  savePlayerProfile();
  renderProfile();
  refreshAuthUI();
  if (unlocked.length) setTimeout(() => { playSound('unlock'); launchConfetti(70); }, 350);
  if (playerLevel() > levelBefore) {
    setTimeout(() => { playSound('levelup'); launchConfetti(190); shakeScreen('sm'); }, 450);
    announceLevelUp(levelBefore, playerLevel());
  }
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
  launchConfetti(60);
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
  [homeScreen,modeScreen,profileScreen,customizeScreen,leaderboardScreen,levelsScreen,gameScreen,raceScreen].forEach(item => item.classList.add('hidden'));
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
document.getElementById('levels-button').addEventListener('click', () => { renderStats(); renderStreak(); showScreen(modeScreen); });
document.getElementById('open-profile-button').addEventListener('click', () => { renderProfile(); showScreen(profileScreen); });
document.getElementById('profile-back-button').addEventListener('click', () => showScreen(modeScreen));
document.getElementById('profile-save-button').addEventListener('click', () => {
  const enteredName = document.getElementById('profile-name-input').value.trim().replace(/\s+/g,' ').slice(0,16);
  if (!currentAccountKey()) playerProfile.username = enteredName || 'Arena Player';
  playerProfile.avatar = selectedProfileAvatar || 'nova';
  savePlayerProfile();
  renderProfile();
  refreshAuthUI();
  document.getElementById('profile-save-status').textContent = 'PROFILE SAVED ✓';
});
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
  if (place === '1st Place') { launchConfetti(150); popText('🏁 1ST PLACE!'); } else if (place === '2nd Place' || place === '3rd Place') launchConfetti(50);
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
function playSound(kind, level) {
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
      click: { notes:[{hz:420,at:0,duration:.07,wave:'sine'}], volume:.055 },
      levelup: { notes:[{hz:523,at:0,duration:.14,wave:'triangle'},{hz:659,at:.09,duration:.14,wave:'triangle'},{hz:784,at:.18,duration:.14,wave:'triangle'},{hz:1047,at:.27,duration:.16,wave:'triangle'},{hz:1319,at:.38,duration:.42,wave:'sine'},{hz:1568,at:.46,duration:.5,wave:'sine'}], volume:.1 },
      unlock: { notes:[{hz:659,at:0,duration:.12,wave:'sine'},{hz:831,at:.08,duration:.12,wave:'sine'},{hz:988,at:.16,duration:.14,wave:'sine'},{hz:1319,at:.25,duration:.32,wave:'triangle'}], volume:.085 },
      reward: { notes:[{hz:988,at:0,duration:.09,wave:'square'},{hz:1319,at:.07,duration:.3,wave:'square'},{hz:1760,at:.2,duration:.34,wave:'sine'}], volume:.05 }
    };
    patterns.combo = { notes:[{hz:Math.min(1400,500 * Math.pow(1.06, Math.min(level, 14))),at:0,duration:.1,wave:'triangle'},{hz:Math.min(2100,750 * Math.pow(1.06, Math.min(level, 14))),at:.06,duration:.16,wave:'sine'}], volume:.075 };
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

/* ---- Feedback effects: confetti, screen shake, pop text, toasts ---- */
function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
const confettiParticles = [];
let confettiFrame = 0;
function launchConfetti(amount, origin) {
  if (prefersReducedMotion()) return;
  let canvas = document.getElementById('fx-canvas');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'fx-canvas'; canvas.setAttribute('aria-hidden', 'true'); document.body.appendChild(canvas); }
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  const context = canvas.getContext('2d');
  const colors = ['#4ea8ff', '#a78bfa', '#ffd36a', '#ff6fb0', '#43e08a', '#ffffff', '#46e6ff'];
  const x0 = origin ? origin.x : window.innerWidth / 2;
  const y0 = origin ? origin.y : window.innerHeight * .38;
  for (let index = 0; index < amount; index++) {
    const angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 9;
    confettiParticles.push({x:x0, y:y0, vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed - 5, size:5 + Math.random() * 7, spin:Math.random() * 6, spinSpeed:(Math.random() - .5) * .4, color:colors[index % colors.length], round:Math.random() < .3, life:1, decay:.007 + Math.random() * .008});
  }
  if (confettiParticles.length > 420) confettiParticles.splice(0, confettiParticles.length - 420);
  cancelAnimationFrame(confettiFrame);
  const step = () => {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let index = confettiParticles.length - 1; index >= 0; index--) {
      const particle = confettiParticles[index];
      particle.vy += .26; particle.vx *= .992; particle.x += particle.vx; particle.y += particle.vy; particle.spin += particle.spinSpeed; particle.life -= particle.decay;
      if (particle.life <= 0 || particle.y > window.innerHeight + 30) { confettiParticles.splice(index, 1); continue; }
      context.save();
      context.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.6));
      context.translate(particle.x, particle.y); context.rotate(particle.spin); context.fillStyle = particle.color;
      if (particle.round) { context.beginPath(); context.arc(0, 0, particle.size / 2, 0, Math.PI * 2); context.fill(); }
      else context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * .6);
      context.restore();
    }
    if (confettiParticles.length) confettiFrame = requestAnimationFrame(step);
    else context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
  confettiFrame = requestAnimationFrame(step);
}
function shakeScreen(strength) {
  if (prefersReducedMotion()) return;
  const root = document.querySelector('.home');
  if (!root) return;
  root.classList.remove('shake-sm', 'shake-lg');
  void root.offsetWidth;
  root.classList.add(strength === 'lg' ? 'shake-lg' : 'shake-sm');
  clearTimeout(shakeScreen.timer);
  shakeScreen.timer = setTimeout(() => root.classList.remove('shake-sm', 'shake-lg'), 600);
  if (navigator.vibrate) { try { navigator.vibrate(strength === 'lg' ? [40, 30, 60] : 25); } catch (error) { /* vibration is optional */ } }
}
function popText(text) {
  const node = document.createElement('div');
  node.className = 'fx-pop';
  node.textContent = text;
  node.setAttribute('aria-hidden', 'true');
  document.body.appendChild(node);
  node.addEventListener('animationend', () => node.remove());
  setTimeout(() => node.remove(), 2200);
}
function showGameToast(title, detail, actionLabel, action) {
  let toast = document.getElementById('level-toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'level-toast'; toast.className = 'level-toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast); }
  toast.innerHTML = '';
  const heading = document.createElement('strong'); heading.textContent = title;
  const text = document.createElement('span'); text.textContent = detail;
  toast.append(heading, text);
  if (actionLabel) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = actionLabel;
    button.addEventListener('click', () => { toast.classList.remove('show'); action(); });
    toast.appendChild(button);
  }
  toast.classList.add('show');
  clearTimeout(showGameToast.timer);
  showGameToast.timer = setTimeout(() => toast.classList.remove('show'), 8000);
}

/* ---- Daily login streak ---- */
const STREAK_REWARDS = [20, 30, 40, 50, 60, 80, 150];
function sanitizeStreak(raw) {
  const count = Math.max(0, Math.floor(Number(raw && raw.count) || 0));
  const best = Math.max(count, Math.floor(Number(raw && raw.best) || 0));
  const last = raw && typeof raw.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.last) ? raw.last : '';
  return {count, best, last};
}
function localDateKey(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(from, to) {
  const utc = value => { const [y, m, d] = value.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(to) - utc(from)) / 86400000);
}
function streakStatus() {
  const streak = playerProfile.streak;
  if (!streak.last) return {state:'new', current:0};
  const gap = daysBetween(streak.last, localDateKey());
  if (gap <= 0) return {state:'claimed', current:streak.count};
  if (gap === 1) return {state:'ready', current:streak.count};
  return {state:'broken', current:0, lost:streak.count};
}
function renderStreak() {
  const card = document.getElementById('streak-card');
  if (!card) return;
  const status = streakStatus();
  const streak = playerProfile.streak;
  const canClaim = status.state !== 'claimed';
  const doneDays = status.state === 'claimed' ? ((status.current - 1) % 7) + 1 : status.state === 'ready' ? status.current % 7 : 0;
  document.getElementById('streak-title').textContent = '🔥 ' + status.current + ' DAY STREAK';
  document.getElementById('streak-best').textContent = 'BEST: ' + streak.best;
  card.classList.toggle('streak-ready', canClaim);
  const days = document.getElementById('streak-days');
  days.innerHTML = '';
  STREAK_REWARDS.forEach((xp, index) => {
    const number = index + 1;
    const tile = document.createElement('div');
    const isDone = number <= doneDays;
    const isToday = canClaim && number === doneDays + 1;
    const isTomorrow = !canClaim && number === doneDays + 1;
    tile.className = 'streak-day' + (isDone ? ' done' : '') + (isToday ? ' today' : '') + (number === 7 ? ' special' : '');
    const label = document.createElement('small'); label.textContent = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : 'DAY ' + number;
    const icon = document.createElement('b'); icon.textContent = isDone ? '✓' : number === 7 ? '🏆' : '🎁';
    const amount = document.createElement('span'); amount.textContent = '+' + xp + ' XP';
    tile.append(label, icon, amount);
    days.appendChild(tile);
  });
  const message = document.getElementById('streak-message');
  const button = document.getElementById('streak-claim');
  button.disabled = !canClaim;
  if (status.state === 'claimed') {
    message.textContent = status.current >= 14 ? 'Reward claimed! Legendary dedication — come back tomorrow.' : 'Reward claimed! Come back tomorrow to keep your streak alive.';
    button.textContent = '✓ CLAIMED TODAY';
  } else {
    const nextDay = status.state === 'ready' ? (status.current % 7) + 1 : 1;
    message.textContent = status.state === 'ready' ? 'Claim today to keep your ' + status.current + '-day streak burning!' : status.state === 'broken' ? 'Your ' + status.lost + '-day streak ended. Start a new one today — your best of ' + streak.best + ' is saved!' : 'Claim your first daily reward and start a streak! Reach 7 days to unlock the exclusive Streak Aura frame.';
    button.textContent = 'CLAIM DAY ' + nextDay + ' • +' + STREAK_REWARDS[nextDay - 1] + ' XP';
  }
}
function claimStreakReward() {
  const status = streakStatus();
  if (status.state === 'claimed') return;
  const before = playerProfile.streak.best;
  const count = status.state === 'ready' ? playerProfile.streak.count + 1 : 1;
  const reward = STREAK_REWARDS[(count - 1) % 7];
  playerProfile.streak = {count, best:Math.max(before, count), last:localDateKey()};
  awardXP(reward);
  renderStreak();
  const button = document.getElementById('streak-claim');
  const box = button.getBoundingClientRect();
  playSound('reward');
  launchConfetti(count % 7 === 0 ? 190 : 100, {x:box.left + box.width / 2, y:box.top});
  popText('🔥 DAY ' + count + ' • +' + reward + ' XP');
  const unlockedNow = [];
  if (before < 7 && playerProfile.streak.best >= 7) unlockedNow.push('Streak Aura frame');
  if (before < 14 && playerProfile.streak.best >= 14) unlockedNow.push('Phoenix suit');
  if (unlockedNow.length) setTimeout(() => { playSound('unlock'); showGameToast('🔥 STREAK REWARD!', '🔓 Unlocked: ' + unlockedNow.join(' and ') + '. Equip it in Customize!', '🎨 CUSTOMIZE NOW', openCustomize); }, 700);
}

/* ---- Sign in, sign out and leaderboard ---- */
const authModal = document.getElementById('auth-modal');
const authToggle = document.getElementById('auth-toggle');
function rankTitleForLevel(level) { return level >= 10 ? 'ARENA LEGEND' : level >= 7 ? 'SPEED MASTER' : level >= 4 ? 'QUICK THINKER' : 'ROOKIE'; }
function leaderboardEntries() {
  return Object.entries(readAccounts()).map(([key, account]) => {
    const xp = Math.max(0, Number(account.xp) || 0);
    return {key, username:String(account.username || 'Player'), avatar:ARENA_CHARACTERS[account.avatar] ? account.avatar : 'nova', xp, level:Math.floor(xp / XP_PER_LEVEL) + 1, achievements:Array.isArray(account.achievements) ? account.achievements.length : 0, custom:sanitizeCustom(account.custom)[ARENA_CHARACTERS[account.avatar] ? account.avatar : 'nova'] || {}};
  }).sort((a, b) => b.xp - a.xp || b.achievements - a.achievements || a.username.localeCompare(b.username));
}
function refreshAuthUI() {
  updateCustomizeButtons();
  renderStreak();
  const key = currentAccountKey();
  authToggle.textContent = key ? '👤 ' + playerProfile.username.toUpperCase() : '👤 SIGN IN';
  authToggle.setAttribute('aria-label', key ? 'Signed in as ' + playerProfile.username + '. Open account menu' : 'Sign in');
  const nameInput = document.getElementById('profile-name-input');
  if (nameInput) { nameInput.disabled = !!key; nameInput.title = key ? 'Your player name is set by your sign in' : ''; }
  const sub = document.getElementById('leaderboard-button-sub');
  if (!sub) return;
  if (!key) { sub.textContent = 'SIGN IN TO JOIN THE RANKING ↗'; return; }
  const entries = leaderboardEntries();
  const position = entries.findIndex(entry => entry.key === key) + 1;
  sub.textContent = 'YOUR RANK #' + position + ' OF ' + entries.length + ' ↗';
}
function renderLeaderboard() {
  const key = currentAccountKey();
  const entries = leaderboardEntries();
  const youCard = document.getElementById('lb-you-card');
  const list = document.getElementById('lb-list');
  youCard.innerHTML = '';
  list.innerHTML = '';
  const position = key ? entries.findIndex(entry => entry.key === key) + 1 : 0;
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  if (key) {
    title.textContent = 'YOUR RANK: #' + position;
    const ahead = position > 1 ? entries[position - 2] : null;
    detail.textContent = ahead ? Math.max(1, ahead.xp - playerProfile.xp + 1) + ' XP to pass ' + ahead.username.toUpperCase() : position === 1 && entries.length > 1 ? 'You are the champion. Keep your lead!' : 'You are the first champion. Invite friends to challenge you!';
    youCard.append(title, detail);
  } else {
    title.textContent = 'YOU ARE PLAYING AS A GUEST';
    detail.textContent = 'Sign in to save your progress and enter the ranking.';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'lb-signin-button'; button.textContent = 'SIGN IN';
    button.addEventListener('click', openAuthModal);
    youCard.append(title, detail, button);
  }
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'lb-empty';
    empty.textContent = 'No champions yet. Sign in, play a few rounds and take the #1 spot!';
    list.appendChild(empty);
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  entries.slice(0, 20).forEach((entry, index) => {
    const row = document.createElement('li');
    row.className = 'lb-row' + (index < 3 ? ' top-' + (index + 1) : '') + (entry.key === key ? ' you' : '');
    const rank = document.createElement('span'); rank.className = 'lb-rank'; rank.textContent = index < 3 ? medals[index] : '#' + (index + 1);
    const avatar = document.createElement('span'); avatar.className = 'lb-avatar'; avatar.innerHTML = arenaCharacterArt(entry.avatar, entry.custom);
    const who = document.createElement('span'); who.className = 'lb-name';
    const name = document.createElement('strong'); name.textContent = entry.username + (entry.key === key ? ' (YOU)' : '');
    const meta = document.createElement('small'); meta.textContent = rankTitleForLevel(entry.level) + ' • LEVEL ' + entry.level;
    who.append(name, meta);
    const xp = document.createElement('span'); xp.className = 'lb-xp';
    const xpValue = document.createElement('strong'); xpValue.textContent = entry.xp;
    const xpLabel = document.createElement('small'); xpLabel.textContent = 'XP';
    xp.append(xpValue, xpLabel);
    const ach = document.createElement('span'); ach.className = 'lb-ach'; ach.textContent = '🏅 ' + entry.achievements; ach.title = entry.achievements + ' achievements';
    row.append(rank, avatar, who, xp, ach);
    list.appendChild(row);
  });
}
function openAuthModal() {
  const key = currentAccountKey();
  document.getElementById('auth-form-view').classList.toggle('hidden', !!key);
  document.getElementById('auth-user-view').classList.toggle('hidden', !key);
  document.getElementById('auth-error').textContent = '';
  if (key) {
    document.getElementById('auth-user-avatar').innerHTML = arenaCharacterArt(playerProfile.avatar, playerProfile.custom[playerProfile.avatar]);
    document.getElementById('auth-user-name').textContent = playerProfile.username;
    const entries = leaderboardEntries();
    document.getElementById('auth-user-detail').textContent = 'LEVEL ' + playerLevel() + ' • ' + playerProfile.xp + ' XP • RANK #' + (entries.findIndex(entry => entry.key === key) + 1);
  }
  authModal.classList.remove('hidden');
  setTimeout(() => (key ? document.getElementById('auth-leaderboard-button') : document.getElementById('auth-name-input')).focus(), 30);
}
function closeAuthModal() { authModal.classList.add('hidden'); authToggle.focus(); }
function signIn(rawName) {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 16);
  if (name.length < 2) return 'Enter a name with at least 2 characters.';
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(name)) return 'Use only letters, numbers, spaces, - _ or .';
  const key = name.toLowerCase();
  const accounts = readAccounts();
  if (accounts[key]) {
    loadAccountIntoProfile(accounts[key]);
  } else {
    accounts[key] = {username:name, avatar:playerProfile.avatar, xp:playerProfile.xp, games:playerProfile.games, achievements:playerProfile.achievements.slice(), custom:playerProfile.custom, streak:playerProfile.streak, updated:Date.now()};
    writeAccounts(accounts);
    playerProfile.username = name;
  }
  localStorage.setItem(SESSION_KEY, key);
  savePlayerProfile();
  renderProfile();
  refreshAuthUI();
  return '';
}
function signOut() {
  localStorage.removeItem(SESSION_KEY);
  Object.assign(playerProfile, {xp:0, games:0, achievements:[], username:'Arena Player', avatar:'nova', custom:{}, streak:{count:0, best:0, last:''}});
  selectedProfileAvatar = 'nova';
  savePlayerProfile();
  renderProfile();
  refreshAuthUI();
}
authToggle.addEventListener('click', openAuthModal);
document.getElementById('auth-close').addEventListener('click', closeAuthModal);
authModal.addEventListener('click', event => { if (event.target === authModal) closeAuthModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !authModal.classList.contains('hidden')) closeAuthModal(); });
document.getElementById('auth-form').addEventListener('submit', event => {
  event.preventDefault();
  const error = signIn(document.getElementById('auth-name-input').value);
  document.getElementById('auth-error').textContent = error;
  if (!error) { document.getElementById('auth-name-input').value = ''; closeAuthModal(); }
});
document.getElementById('auth-signout-button').addEventListener('click', () => { signOut(); closeAuthModal(); });
document.getElementById('auth-leaderboard-button').addEventListener('click', () => { authModal.classList.add('hidden'); renderLeaderboard(); showScreen(leaderboardScreen); });
document.getElementById('open-leaderboard-button').addEventListener('click', () => { renderLeaderboard(); showScreen(leaderboardScreen); });
document.getElementById('leaderboard-back-button').addEventListener('click', () => { refreshAuthUI(); showScreen(modeScreen); });
refreshAuthUI();
document.getElementById('streak-claim').addEventListener('click', claimStreakReward);

/* ---- Customization ---- */
let customizeTab = 'skin';
function itemLevel(item) { return item.lvl || 1; }
function itemUnlocked(item) { return itemLevel(item) <= playerLevel() && (!item.streak || playerProfile.streak.best >= item.streak); }
function allCustomItems() {
  const items = [];
  CUSTOM_CATEGORIES.forEach(category => category.list.forEach(item => items.push({category:category.label, name:item.name, lvl:itemLevel(item), streak:item.streak || 0, unlocked:itemUnlocked(item)})));
  Object.values(ARENA_CHARACTERS).forEach(character => items.push({category:'CHARACTER', name:character.name, lvl:character.unlock || 1, streak:0, unlocked:(character.unlock || 1) <= playerLevel()}));
  return items;
}
function unlockedCustomCount() { return allCustomItems().filter(item => item.unlocked).length; }
function updateCustomizeButtons() {
  const text = unlockedCustomCount() + ' / ' + allCustomItems().length + ' ITEMS UNLOCKED';
  document.querySelectorAll('.customize-progress-sub').forEach(node => { node.textContent = text; });
}
function currentCustom() { return playerProfile.custom[selectedProfileAvatar] || {}; }
function setCustomChoice(key, value) {
  const entry = Object.assign({}, currentCustom());
  if (value === null) delete entry[key]; else entry[key] = value;
  playerProfile.custom[selectedProfileAvatar] = entry;
  playerProfile.avatar = selectedProfileAvatar;
  savePlayerProfile();
  renderProfile();
  refreshAuthUI();
  renderCustomize();
}
function customHint(message) { document.getElementById('customize-hint').textContent = message; }
function lockedMessage(item) {
  if (item.streak) return item.name.toUpperCase() + ' UNLOCKS WITH A ' + item.streak + '-DAY LOGIN STREAK • YOUR BEST: ' + playerProfile.streak.best;
  const need = itemLevel(item);
  return item.name.toUpperCase() + ' UNLOCKS AT LEVEL ' + need + ' • ' + Math.max(0, (need - 1) * XP_PER_LEVEL - playerProfile.xp) + ' XP TO GO';
}
function renderCustomize() {
  const level = playerLevel();
  const base = ARENA_CHARACTERS[selectedProfileAvatar] || ARENA_CHARACTERS.nova;
  const choice = currentCustom();
  document.getElementById('customize-stage').innerHTML = arenaCharacterArt(selectedProfileAvatar, choice);
  document.getElementById('customize-char-name').textContent = base.name;
  document.getElementById('customize-char-role').textContent = base.role;
  const nextLevel = allCustomItems().filter(item => !item.streak).map(item => item.lvl).filter(value => value > level).sort((a, b) => a - b)[0];
  const nextNames = nextLevel ? allCustomItems().filter(item => !item.streak && item.lvl === nextLevel).map(item => item.name) : [];
  document.getElementById('customize-level-info').textContent = nextLevel ? 'LEVEL ' + level + ' • NEXT UNLOCK AT LEVEL ' + nextLevel + ': ' + nextNames.slice(0, 3).join(', ') + (nextNames.length > 3 ? '…' : '') : 'LEVEL ' + level + ' • EVERYTHING UNLOCKED!';
  const tabs = document.getElementById('customize-tabs');
  tabs.innerHTML = '';
  CUSTOM_CATEGORIES.forEach(category => {
    const open = category.list.filter(itemUnlocked).length;
    const tab = document.createElement('button');
    tab.type = 'button'; tab.setAttribute('role', 'tab');
    tab.className = 'customize-tab' + (category.key === customizeTab ? ' active' : '');
    tab.setAttribute('aria-selected', String(category.key === customizeTab));
    const label = document.createElement('span'); label.textContent = category.icon + ' ' + category.label;
    const count = document.createElement('small'); count.textContent = open + '/' + category.list.length;
    tab.append(label, count);
    tab.addEventListener('click', () => { customizeTab = category.key; customHint('Pick an option to change your look. Changes save automatically.'); renderCustomize(); });
    tabs.appendChild(tab);
  });
  const category = CUSTOM_CATEGORIES.find(entry => entry.key === customizeTab) || CUSTOM_CATEGORIES[0];
  const grid = document.getElementById('customize-grid');
  grid.innerHTML = '';
  const defaults = {emblem:'diamond', accessory:'none', frame:'default'};
  const baseColor = {skin:base.skin, hairColor:base.hair, eyes:base.iris, outfit:base.cape};
  const options = [];
  if (!(category.key in defaults)) options.push({id:null, name:'Original', lvl:1, color:baseColor[category.key]});
  category.list.forEach(item => options.push(item));
  options.forEach(item => {
    const locked = !itemUnlocked(item);
    const selected = item.id === null ? !(category.key in choice) : (choice[category.key] || defaults[category.key]) === item.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'customize-option' + (selected ? ' selected' : '') + (locked ? ' locked' : '');
    button.setAttribute('aria-pressed', String(selected));
    if (locked) button.setAttribute('aria-disabled', 'true');
    const art = document.createElement('span'); art.className = 'customize-option-art';
    const swatchColor = item.color || (category.key === 'outfit' ? item.cape : null);
    if (category.swatch || (category.key === 'outfit' && item.id === null)) {
      art.classList.add('swatch'); art.style.background = swatchColor;
    } else {
      const previewChoice = Object.assign({}, choice);
      if (item.id === null) delete previewChoice[category.key]; else previewChoice[category.key] = item.id;
      art.innerHTML = arenaCharacterArt(selectedProfileAvatar, previewChoice);
    }
    if (category.key === 'outfit' && item.id !== null) { art.innerHTML = arenaCharacterArt(selectedProfileAvatar, Object.assign({}, choice, {outfit:item.id})); }
    if (locked) { const lock = document.createElement('span'); lock.className = 'customize-lock'; lock.textContent = item.streak ? '🔥 ' + item.streak + ' DAYS' : '🔒 LV ' + itemLevel(item); art.appendChild(lock); }
    const name = document.createElement('small'); name.textContent = item.name;
    button.append(art, name);
    button.addEventListener('click', () => {
      if (locked) { customHint('🔒 ' + lockedMessage(item)); return; }
      setCustomChoice(category.key, item.id);
      customHint('✓ ' + (item.id === null ? 'ORIGINAL ' + category.label : item.name.toUpperCase()) + ' EQUIPPED');
    });
    grid.appendChild(button);
  });
}
function randomizeCustom() {
  const level = playerLevel();
  const entry = {};
  CUSTOM_CATEGORIES.forEach(category => {
    const open = category.list.filter(itemUnlocked);
    entry[category.key] = open[Math.floor(Math.random() * open.length)].id;
  });
  playerProfile.custom[selectedProfileAvatar] = entry;
  playerProfile.avatar = selectedProfileAvatar;
  savePlayerProfile(); renderProfile(); refreshAuthUI(); renderCustomize();
  customHint('🎲 NEW RANDOM LOOK!');
}
function openCustomize() {
  if (!ARENA_CHARACTERS[selectedProfileAvatar] || playerLevel() < (ARENA_CHARACTERS[selectedProfileAvatar].unlock || 1)) selectedProfileAvatar = playerProfile.avatar;
  customHint('Pick an option to change your look. Changes save automatically.');
  renderCustomize();
  showScreen(customizeScreen);
}
function announceLevelUp(before, after) {
  const names = allCustomItems().filter(item => !item.streak && item.lvl > before && item.lvl <= after).map(item => item.name);
  const detail = names.length ? '🔓 Unlocked: ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) + ' more' : '') : 'Keep playing to unlock more looks!';
  showGameToast('⬆ LEVEL UP! LEVEL ' + after, detail, names.length ? '🎨 CUSTOMIZE NOW' : '', openCustomize);
}
document.getElementById('open-customize-button').addEventListener('click', openCustomize);
document.getElementById('open-customize-quick').addEventListener('click', openCustomize);
document.getElementById('customize-back-button').addEventListener('click', () => { renderProfile(); showScreen(profileScreen); });
document.getElementById('customize-random').addEventListener('click', randomizeCustom);
document.getElementById('customize-reset').addEventListener('click', () => {
  delete playerProfile.custom[selectedProfileAvatar];
  savePlayerProfile(); renderProfile(); refreshAuthUI(); renderCustomize(); customHint('↺ ORIGINAL LOOK RESTORED');
});
updateCustomizeButtons();
