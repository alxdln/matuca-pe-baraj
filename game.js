/* =========================================================================
   1. ZONA DE SETĂRI - MODIFICĂ AICI PROBABILITĂȚILE ȘI VALORILE
   ========================================================================= */
const CONFIG = {
    // --- SETĂRI MECANICĂ SPECIALĂ ---
    rotiriExtraPrag: 5,       
    matucaPerPrag: 4,          
    sansaSalvareLupu: 0.5,     
    
    // --- PROBABILITĂȚI APARIȚIE PERSONAJE (Șanse din 100) ---
    sansaScatterBase: 7.0,     
    sansaMatuca: 3.0,          
    respingereMatuca2: 0.75,   
    respingereMatuca3: 0.95,   
    sansaToncea: 1.5,          
  
    // --- FRECVENȚĂ PEȘTI (Șanse din 100) ---
    pestiBase: [4.0, 7.0, 10.0, 17.0], 
    pestiLvl1: [3.0, 3.5, 4.0, 7.0], 
    pestiLvl2: [2.5, 3.0, 3.8, 6.5], 
    pestiLvl3: [2.0, 2.6, 3.6, 6.0], 
    pestiLvl4: [1.8, 2.4, 3.4, 5.5], 
    pestiLvl5: [1.5, 2.2, 3.2, 5.0]  
};

/* =========================================================================
   2. CONFIGURAȚIE SIMBOLURI & VALORI (TABEL DE PLĂȚI)
   ========================================================================= */
const SYMBOLS = {
  10:       { name: '10',         type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🔟' },
  J:        { name: 'J',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🎣' },
  Q:        { name: 'Q',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🪱' },
  K:        { name: 'K',          type: 'low',     mult: [0, 0.5, 1, 2, 5], emoji: '🍺' },
  A:        { name: 'A',          type: 'low',     mult: [0, 1, 2, 5, 10], emoji: '🛶' },
  ALBITURI: { name: 'Albituri',   type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐟', money: [1, 2] },
  CARAS:    { name: 'Caras',      type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐠', money: [2, 3, 4] },
  CLEAN:    { name: 'Clean',      type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐡', money: [5, 10] },
  CRAP:     { name: 'Crap',       type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🦈', money: [25, 50] }, 
  TONCEA:   { name: 'Toncea 👮',  type: 'char',    mult: [0, 0, 0, 0, 0],   emoji: '👮‍♂️', file: 'assets/toncea.png' },
  LUPU:     { name: 'Dr. Lupu 🩺', type: 'char',   mult: [0, 0, 0, 0, 0],   emoji: '👨‍⚕️', file: 'assets/lupu.png' },
  SCATTER:  { name: 'Gogoașă 🍩', type: 'scatter', mult: [0, 0, 0, 0, 0],   emoji: '🍩', file: 'assets/gogoasa.png' },
  MATUCA:   { name: 'Mațuca 🎣',  type: 'wild',    mult: [0, 0, 0, 0, 0],   emoji: '🧔', file: 'assets/matuca.png' }
};

const PAYLINES = [
  [1, 1, 1, 1, 1], 
  [0, 0, 0, 0, 0], 
  [2, 2, 2, 2, 2], 
  [0, 1, 2, 1, 0], 
  [2, 1, 0, 1, 2], 
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 2, 2, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0]
];

/* =========================================================================
   3. STARE JOC & WEB AUDIO API
   ========================================================================= */
let balance = 1000.0;
let currentBet = 5.0;
let isSpinning = false;
let isTurbo = false;
let soundEnabled = true;

let activeSpins = [];
let stopRequested = false;

let isFreeSpins = false;
let fsRemaining = 0;
let matucaCount = 0;
let fsLevel = 0; 
let fsTotalWin = 0; 
const MULTIPLIERS = [1, 2, 3, 5, 10]; 

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(type) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'spin') {
      osc.frequency.setValueAtTime(140, t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.08);
    } else if (type === 'reel-stop') {
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (type === 'win') {
      [260, 330, 392, 520].forEach(function(freq, i) {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.08, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.2);
        o.start(t + i * 0.08);
        o.stop(t + i * 0.08 + 0.2);
      });
    } else if (type === 'police') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(900, t + 0.15);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === 'resuscitate') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch (e) {}
}

/* =========================================================================
   ELEMENTE DOM & INITIALIZARE
   ========================================================================= */
const btnSpin = document.getElementById('btnSpin');
const balanceEl = document.getElementById('balanceDisplay');
const betEl = document.getElementById('betDisplay');
const winEl = document.getElementById('winAmount');
const statusEl = document.getElementById('statusMessage');
const fsBar = document.getElementById('fsProgressBar');
const fsCountEl = document.getElementById('fsCount');
const progressFill = document.getElementById('progressFill');

const overlay = document.getElementById('eventOverlay');
const eventEmoji = document.getElementById('eventEmoji');
const eventTitle = document.getElementById('eventTitle');
const eventDesc = document.getElementById('eventDesc');

let activeModalTimeout = null;
let activeModalResolve = null;

function initProgressBar() {
  const trail = document.getElementById('trailContainer');
  trail.innerHTML = '';
  // Fără 1x, arătăm doar pragurile finale de cucerit!
  const mults = ['2x', '3x', '5x', '10x'];
  
  for(let i = 0; i < 4; i++) {
    const group = document.createElement('div');
    group.className = 'trail-group';
    
    // Generăm fix 3 iconițe cu Mațuca per grup
    for(let j = 1; j <= 3; j++) {
      const icon = document.createElement('img');
      icon.src = 'assets/matuca.png';
      icon.className = 'trail-icon';
      // Calculăm indexul real (ex: 1, 2, 3... apoi 5, 6, 7...) 
      icon.id = 'mat-icon-' + (i * CONFIG.matucaPerPrag + j);
      group.appendChild(icon);
    }
    
    // Al 4-lea element este tag-ul multiplicatorului
    const tag = document.createElement('div');
    tag.className = 'multiplier-tag';
    tag.id = 'mult-' + (i + 1); 
    tag.innerText = mults[i];
    group.appendChild(tag);
    
    trail.appendChild(group);
  }
}

function createInitialGrid() {
  const pool = ['10', 'J', 'Q', 'K', 'A', 'ALBITURI', 'CARAS'];
  for (let c = 0; c < 5; c++) {
    const reel = document.getElementById('reel-' + c);
    reel.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      const symKey = pool[Math.floor(Math.random() * pool.length)];
      let mVal = null;
      if (SYMBOLS[symKey].type === 'fish') {
        mVal = SYMBOLS[symKey].money[0]; 
      }
      reel.appendChild(renderCell(symKey, mVal));
    }
  }
}

function renderCell(symKey, moneyVal) {
  moneyVal = moneyVal || null;
  const sym = SYMBOLS[symKey];
  const div = document.createElement('div');
  div.className = 'cell';
  
  if (symKey === 'SCATTER') div.className += ' scatter-symbol';
  div.dataset.key = symKey;

  let imgOrEmoji = '';
  if (sym.file) {
    imgOrEmoji = '\x3Cimg src="' + sym.file + '" onerror="this.outerHTML=\'\x3Cdiv class=\\\'cell-fallback\\\'\x3E' + sym.emoji + '\x3C/div\x3E\'"\x3E';
  } else {
    imgOrEmoji = '\x3Cdiv class="cell-fallback"\x3E' + sym.emoji + '\x3C/div\x3E';
  }

  let labelTag = '';
  let moneyTag = '';

  // Eliminat complet eticheta Gogoașă din Base Game

  // În timpul specialei, afișăm valoarea peștilor peste iconiță
  if (isFreeSpins && sym.type === 'fish' && moneyVal) {
      moneyTag = '\x3Cdiv class="money-tag"\x3E' + (moneyVal * currentBet) + '\x3C/div\x3E';
  }

  div.innerHTML = imgOrEmoji + labelTag + moneyTag;
  return div;
}

/* =========================================================================
   RULARE & DISTRIBUȚIE SIMBOLURI
   ========================================================================= */
function getRandomSymbol() {
  const rand = Math.random() * 100;

  if (isFreeSpins) {
    if (rand < CONFIG.sansaMatuca) return 'MATUCA';   
    
    let offset = CONFIG.sansaMatuca;
    if (fsLevel >= 1) {
        if (rand < offset + CONFIG.sansaToncea) return 'TONCEA';
        offset += CONFIG.sansaToncea;
    }

    let cRate = [];
    if (fsLevel === 0) cRate = CONFIG.pestiLvl1;
    else if (fsLevel === 1) cRate = CONFIG.pestiLvl2;
    else if (fsLevel === 2) cRate = CONFIG.pestiLvl3;
    else if (fsLevel === 3) cRate = CONFIG.pestiLvl4;
    else cRate = CONFIG.pestiLvl5;

    if (rand < offset + cRate[0]) return 'CRAP'; offset += cRate[0];
    if (rand < offset + cRate[1]) return 'CLEAN'; offset += cRate[1];
    if (rand < offset + cRate[2]) return 'CARAS'; offset += cRate[2];
    if (rand < offset + cRate[3]) return 'ALBITURI';
    
  } else {
    if (rand < CONFIG.sansaScatterBase) return 'SCATTER';  
    
    let bOff = CONFIG.sansaScatterBase;
    let bRate = CONFIG.pestiBase;
    if (rand < bOff + bRate[0]) return 'CRAP'; bOff += bRate[0];
    if (rand < bOff + bRate[1]) return 'CLEAN'; bOff += bRate[1];
    if (rand < bOff + bRate[2]) return 'CARAS'; bOff += bRate[2];
    if (rand < bOff + bRate[3]) return 'ALBITURI';
  }

  const lows = ['10', 'J', 'Q', 'K', 'A'];
  return lows[Math.floor(Math.random() * lows.length)];
}

async function triggerSpin() {
  if (isSpinning) {
    if (!stopRequested && activeSpins.length > 0) {
      stopRequested = true;
      btnSpin.disabled = true;
      btnSpin.innerText = '...';
      activeSpins.forEach(function(stopFn) { stopFn(); });
      activeSpins = [];
    }
    return;
  }

  if (!isFreeSpins && balance < currentBet) {
    statusEl.innerText = "Fonduri insuficiente! Ia o pauză de la pescuit.";
    return;
  }

  isSpinning = true;
  stopRequested = false;
  activeSpins = [];
  
  const reelsFrame = document.getElementById('reelsFrame');
  reelsFrame.classList.add('is-spinning');
  
  btnSpin.disabled = false;
  btnSpin.innerText = 'STOP';
  btnSpin.style.background = 'radial-gradient(circle, #ff9900 0%, #aa4400 100%)';

  if (!isFreeSpins) {
    balance -= currentBet;
    winEl.innerText = "0.00"; 
    updateUI();
  } else {
    fsRemaining--;
    fsCountEl.innerText = fsRemaining;
  }

  statusEl.innerText = isFreeSpins ? "Pescuim în specială pe baraj..." : "Plutesc baboii pe lac...";

  const matrix = [];
  const moneyMatrix = [];

  for (let c = 0; c < 5; c++) {
    const col = [];
    const mCol = [];
    let hasScatterInCol = false;

    for (let r = 0; r < 3; r++) {
      let symKey = getRandomSymbol();

      if (symKey === 'SCATTER') {
        if (hasScatterInCol) {
          while (symKey === 'SCATTER') {
            symKey = getRandomSymbol();
          }
        } else {
          hasScatterInCol = true;
        }
      }

      col.push(symKey);

      if (SYMBOLS[symKey].type === 'fish') {
        const mults = SYMBOLS[symKey].money;
        if (isFreeSpins) {
          mCol.push(mults[Math.floor(Math.random() * mults.length)]);
        } else {
          mCol.push(mults[0]); 
        }
      } else {
        mCol.push(null);
      }
    }
    matrix.push(col);
    moneyMatrix.push(mCol);
  }

  if (isFreeSpins) {
    let matucasInGrid = 0;
    let tonceasInGrid = 0;

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        if (matrix[c][r] === 'MATUCA') {
          matucasInGrid++;
          if (matucasInGrid === 2 && Math.random() < CONFIG.respingereMatuca2) { 
            matrix[c][r] = '10';
            matucasInGrid--;
          } else if (matucasInGrid === 3 && Math.random() < CONFIG.respingereMatuca3) {
            matrix[c][r] = '10'; 
            matucasInGrid--;
          } else if (matucasInGrid > 3) {
            matrix[c][r] = '10'; 
          }
        }
      }
    }

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        if (matrix[c][r] === 'TONCEA') {
          if (matucasInGrid === 0 || tonceasInGrid >= 1) {
            matrix[c][r] = 'J'; 
          } else {
            tonceasInGrid++;
          }
        }
      }
    }
  }

  const baseDuration = isTurbo ? 500 : 1200;
  let promises = [];
  
  for (let c = 0; c < 5; c++) {
    let stagger = c * (isTurbo ? 100 : 250);
    promises.push(animateReel(c, matrix[c], moneyMatrix[c], baseDuration + stagger));
  }

  await Promise.all(promises);

  btnSpin.disabled = true;
  btnSpin.innerText = '...';
  btnSpin.style.background = '';
  
  reelsFrame.classList.remove('is-spinning');

  await evaluateRound(matrix, moneyMatrix);
}

function animateReel(colIdx, finalSymbols, finalMoneys, duration) {
  return new Promise(function(resolve) {
    const reel = document.getElementById('reel-' + colIdx);
    
    const oldChildren = reel.children;
    const currentCells = [];
    for (let i = 0; i < oldChildren.length; i++) {
        currentCells.push(oldChildren[i]);
    }
    
    const newStrip = document.createElement('div');
    newStrip.className = 'reel-strip';

    for(let r = 0; r < 3; r++) {
        newStrip.appendChild(renderCell(finalSymbols[r], finalMoneys[r]));
    }

    const fillerCount = isTurbo ? 8 : 18;
    for(let i = 0; i < fillerCount; i++) {
        let symKey = getRandomSymbol();
        let mVal = SYMBOLS[symKey].type === 'fish' ? SYMBOLS[symKey].money[0] : null;
        let cell = renderCell(symKey, mVal);
        cell.classList.add('blur-spin'); 
        newStrip.appendChild(cell);
    }

    for(let i = 0; i < currentCells.length; i++) {
        let clone = currentCells[i].cloneNode(true);
        clone.classList.remove('win-highlight', 'highlight-fish'); 
        newStrip.appendChild(clone);
    }

    reel.innerHTML = '';
    reel.appendChild(newStrip);

    newStrip.style.transform = 'translateY(calc(-100% + 3 * var(--cell-h)))';

    void newStrip.offsetWidth;

    playSfx('spin');

    newStrip.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.2, 0.8, 0.2, 1.05)';
    newStrip.style.transform = 'translateY(0)';

    let resolved = false;

    const stopFn = function() {
      if (resolved) return;
      resolved = true;
      
      playSfx('reel-stop'); 
      
      reel.innerHTML = '';
      for(let r = 0; r < 3; r++) {
          reel.appendChild(renderCell(finalSymbols[r], finalMoneys[r]));
      }
      
      resolve();
    };

    activeSpins.push(stopFn);

    newStrip.addEventListener('transitionend', stopFn);
    setTimeout(stopFn, duration + 50);
  });
}

/* =========================================================================
   REGULI DE JOC, TONCEA, MATUCA & GOGOSI
   ========================================================================= */
async function evaluateRound(matrix, moneyMatrix) {
  let lineWins = 0;

  PAYLINES.forEach(function(line) {
    const firstSym = matrix[0][line[0]];
    if (firstSym === 'SCATTER' || firstSym === 'MATUCA') return;
    
    if (isFreeSpins && SYMBOLS[firstSym].type !== 'fish') return;

    let matchCount = 1;
    for (let c = 1; c < 5; c++) {
      const currentSym = matrix[c][line[c]];
      if (currentSym === firstSym) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const payout = SYMBOLS[firstSym].mult[matchCount - 1] * currentBet;
      lineWins += payout;

      for (let c = 0; c < matchCount; c++) {
        let winReel = document.getElementById('reel-' + c);
        if (winReel && winReel.children[line[c]]) {
          winReel.children[line[c]].classList.add('win-highlight');
        }
      }
    }
  });

  let totalSpinWin = lineWins;

  if (!isFreeSpins) {
    let scatters = 0;
    matrix.forEach(function(col) { 
        col.forEach(function(s) { if (s === 'SCATTER') scatters++; }); 
    });

    if (scatters >= 3) {
      fsRemaining = scatters === 3 ? 10 : scatters === 4 ? 15 : 20;
      await new Promise(function(r) { setTimeout(r, 1000); });
      await showEventModal('assets/matuca.png', 'SPECIALA CU GOGOȘI!', 'Ai prins ' + scatters + ' Gogoși! Primești ' + fsRemaining + ' Rotiri Gratuite!');
      startFreeSpins();
      return; 
    }
  }

  if (isFreeSpins) {
    let hasToncea = false;
    let fishSum = 0;
    
    let spinMatucas = 0; 
    let matucaDOMNodes = []; 
    let fishDOMNodes = []; 

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        if (matrix[c][r] === 'MATUCA') {
          spinMatucas++;
          matucaCount++; 
          matucaDOMNodes.push(document.getElementById('reel-' + c).children[r]);
        }
        if (matrix[c][r] === 'TONCEA') hasToncea = true;
        if (moneyMatrix[c][r]) {
          fishSum += moneyMatrix[c][r] * currentBet;
          fishDOMNodes.push({
            el: document.getElementById('reel-' + c).children[r],
            amount: moneyMatrix[c][r] * currentBet
          });
        }
      }
    }

    updateCollectorProgress();

    if (spinMatucas > 0 && hasToncea) {
      await new Promise(function(r) { setTimeout(r, 1000); });
      playSfx('police');
      await showEventModal('assets/toncea.png', 'CONTROL DE LA TONCEA!', 'A apărut Toncea pe baraj! Toată captura a fost confiscată!');
      fishSum = 0;
    } 
    else if (spinMatucas > 0 && fishSum > 0) {
      const currentMult = MULTIPLIERS[fsLevel];
      const collectedTotal = fishSum * currentMult * spinMatucas;

      await new Promise(function(resolve) {
        playSfx('win');
        
        fishDOMNodes.forEach(function(fishNode) {
          fishNode.el.classList.add('highlight-fish');
          // ASCUNDEM TAG-UL ORIGINAL de bani de pe peste cand incepe animatia
          let tag = fishNode.el.querySelector('.money-tag');
          if (tag) {
              tag.style.opacity = '0';
          }
        });

        matucaDOMNodes.forEach(function(matucaEl) {
          const mRect = matucaEl.getBoundingClientRect();
          
          fishDOMNodes.forEach(function(fishNode) {
            const fRect = fishNode.el.getBoundingClientRect();
            
            const flyEl = document.createElement('div');
            flyEl.className = 'flying-money';
            flyEl.innerText = '+' + (fishNode.amount * currentMult);
            flyEl.style.left = fRect.left + 'px';
            flyEl.style.top = fRect.top + 'px';
            document.body.appendChild(flyEl);
            
            void flyEl.offsetWidth;
            
            flyEl.style.left = (mRect.left + (mRect.width/4)) + 'px';
            flyEl.style.top = (mRect.top + (mRect.height/4)) + 'px';
            flyEl.style.transform = 'scale(0.3)';
            flyEl.style.opacity = '0';
            
            setTimeout(function() { flyEl.remove(); }, 1850);
          });
        });

        setTimeout(resolve, 1900); 
      });

      totalSpinWin += collectedTotal;
      let textWin = '🎣 Mațuca a tras baboi de ' + collectedTotal.toFixed(2) + ' Lei (' + currentMult + 'x)';
      if (spinMatucas > 1) textWin += ' MULTIPLICAT DE ' + spinMatucas + ' PESCARI!';
      statusEl.innerText = textWin;
    }
    
    fsTotalWin += totalSpinWin;
    winEl.innerText = fsTotalWin.toFixed(2);
  }

  if (!isFreeSpins) {
    if (totalSpinWin > 0) {
        balance += totalSpinWin; 
        winEl.innerText = totalSpinWin.toFixed(2);
        playSfx('win');
        statusEl.innerText = 'Câștig pe linie: +' + totalSpinWin.toFixed(2) + ' Lei!';
    }
  } else {
    if (totalSpinWin > 0) {
        playSfx('win');
    }
  }

  updateUI();
  isSpinning = false;

  if (isFreeSpins) {
    if (fsRemaining === 0) {
      await handleEndOfFreeSpins();
    } else {
      btnSpin.disabled = false;
      btnSpin.innerText = 'LANSEAZĂ';
    }
  } else {
    btnSpin.disabled = false;
    btnSpin.innerText = 'LANSEAZĂ';
  }
}

/* =========================================================================
   ANIMATIE TRANSFER BANI 
   ========================================================================= */
function animateWinToBalance(amount) {
    return new Promise(function(resolve) {
      const wRect = winEl.getBoundingClientRect();
      const bRect = balanceEl.getBoundingClientRect();
  
      const flyEl = document.createElement('div');
      flyEl.className = 'flying-money';
      flyEl.innerText = '+' + amount.toFixed(2);
      
      flyEl.style.left = wRect.left + 'px';
      flyEl.style.top = wRect.top + 'px';
      document.body.appendChild(flyEl);
      
      void flyEl.offsetWidth; 
      
      flyEl.style.left = bRect.left + 'px';
      flyEl.style.top = bRect.top + 'px';
      flyEl.style.transform = 'scale(0.5)';
      flyEl.style.opacity = '0';
      
      playSfx('win');
      
      setTimeout(function() { 
        flyEl.remove(); 
        balance += amount; 
        updateUI();
        resolve(); 
      }, 1850);
    });
}

/* =========================================================================
   SPECIALĂ & MECANICA DE ÎNEC CU DR. LUPU
   ========================================================================= */
function startFreeSpins() {
  isFreeSpins = true;
  matucaCount = 0;
  fsLevel = 0;
  fsTotalWin = 0; 
  fsBar.classList.remove('hidden');
  fsCountEl.innerText = fsRemaining;
  winEl.innerText = "0.00"; 
  
  const totalIcons = CONFIG.matucaPerPrag * 4;
  for(let i=1; i<=totalIcons; i++) {
    let icon = document.getElementById('mat-icon-' + i);
    if(icon) icon.classList.remove('collected');
  }
  activateMultTag(0); 
  
  isSpinning = false;
  btnSpin.disabled = false;
  btnSpin.innerText = 'LANSEAZĂ';
}

function updateCollectorProgress() {
  let p = CONFIG.matucaPerPrag;
  const totalNecesar = p * 4;
  
  for (let i = 1; i <= Math.min(matucaCount, totalNecesar); i++) {
    let icon = document.getElementById('mat-icon-' + i);
    if (icon && !icon.classList.contains('collected')) {
      icon.classList.add('collected');
    }
  }

  if (matucaCount >= p*4 && fsLevel < 4) {
    fsLevel = 4;
    fsRemaining += CONFIG.rotiriExtraPrag;
    activateMultTag(4); 
    showEventModal('🔥', 'MAȚUCA 10X!', 'Nivel Maxim pe Baraj! +' + CONFIG.rotiriExtraPrag + ' Rotiri!');
  } else if (matucaCount >= p*3 && fsLevel < 3) {
    fsLevel = 3;
    fsRemaining += CONFIG.rotiriExtraPrag;
    activateMultTag(3); 
    showEventModal('⭐', 'MAȚUCA 5X!', 'Nivelul 3 atins! +' + CONFIG.rotiriExtraPrag + ' Rotiri!');
  } else if (matucaCount >= p*2 && fsLevel < 2) {
    fsLevel = 2;
    fsRemaining += CONFIG.rotiriExtraPrag;
    activateMultTag(2); 
    showEventModal('⚡', 'MAȚUCA 3X!', 'Nivelul 2 atins! +' + CONFIG.rotiriExtraPrag + ' Rotiri!');
  } else if (matucaCount >= p*1 && fsLevel < 1) {
    fsLevel = 1;
    fsRemaining += CONFIG.rotiriExtraPrag;
    activateMultTag(1); 
    showEventModal('🎣', 'MAȚUCA 2X!', 'Primul prag atins! +' + CONFIG.rotiriExtraPrag + ' Rotiri!');
  }

  fsCountEl.innerText = fsRemaining;
}

function activateMultTag(level) {
  for(let i = 1; i <= 4; i++) {
    let tag = document.getElementById('mult-' + i);
    if (tag) {
      if (i <= level) tag.classList.add('active');
      else tag.classList.remove('active');
    }
  }
}

async function handleEndOfFreeSpins() {
  await new Promise(function(r) { setTimeout(r, 1000); });

  if (matucaCount < CONFIG.matucaPerPrag) {
    await showEventModal('assets/matuca.png', 'MAȚUCA SE ÎNEACĂ!', 'Nu a atins pragul și a căzut de pe baraj în apă!');

    const doctorSaves = Math.random() < CONFIG.sansaSalvareLupu;

    if (doctorSaves) {
      await new Promise(function(r) { setTimeout(r, 800); }); 
      playSfx('resuscitate');
      await showEventModal('assets/lupu.png', 'DR. LUPU ÎL RESUSCITEAZĂ!', 'Intervenție de urgență! Primești +3 Rotiri Gratuite!');
      fsRemaining = 3;
      fsCountEl.innerText = fsRemaining;
      
      btnSpin.disabled = false;
      btnSpin.innerText = 'LANSEAZĂ';
      return; 
    } else {
      await showEventModal('⚰️', 'A ÎNGHIȚIT PREA MULTĂ APĂ...', 'Dr. Lupu nu a ajuns la timp. Câștig total: ' + fsTotalWin.toFixed(2) + ' Lei!');
    }
  } else {
    await showEventModal('🏆', 'PARTIDĂ FINALIZATĂ!', 'Felicitări! Câștig total în specială: ' + fsTotalWin.toFixed(2) + ' Lei!');
  }

  if (fsTotalWin > 0) {
      await animateWinToBalance(fsTotalWin);
  }

  isFreeSpins = false;
  fsBar.classList.add('hidden');
  btnSpin.disabled = false;
  btnSpin.innerText = "LANSEAZĂ";
  statusEl.innerText = "Partidă încheiată. Apasă LANSEAZĂ pentru o nouă tură!";
}

/* =========================================================================
   MODAL & CONTROALE SETĂRI (CU CLICK-TO-CLOSE)
   ========================================================================= */
function showEventModal(iconSrc, title, desc) {
  return new Promise(function(resolve) {
    const iconContainer = document.getElementById('eventEmoji');
    
    if (iconSrc.indexOf('.png') !== -1 || iconSrc.indexOf('.jpg') !== -1) {
      iconContainer.innerHTML = '\x3Cimg src="' + iconSrc + '" class="event-image"\x3E';
    } else {
      iconContainer.innerHTML = iconSrc;
    }
    
    eventTitle.innerText = title;
    eventDesc.innerText = desc;
    overlay.classList.remove('hidden');

    activeModalResolve = resolve;
    activeModalTimeout = setTimeout(closeEventModal, 3500); 
  });
}

function closeEventModal() {
  overlay.classList.add('hidden');
  if (activeModalTimeout) {
    clearTimeout(activeModalTimeout);
    activeModalTimeout = null;
  }
  if (activeModalResolve) {
    activeModalResolve();
    activeModalResolve = null;
  }
}

overlay.onclick = closeEventModal;

function updateUI() {
  balanceEl.innerText = balance.toFixed(2);
  betEl.innerText = currentBet.toFixed(2);
}

const modalSettings = document.getElementById('modalSettings');
document.getElementById('btnSettings').onclick = function() { modalSettings.classList.remove('hidden'); };
document.getElementById('btnCloseSettings').onclick = function() {
  currentBet = parseFloat(document.getElementById('selectBet').value);
  isTurbo = document.getElementById('chkTurbo').checked;
  soundEnabled = document.getElementById('chkSound').checked;
  updateUI();
  modalSettings.classList.add('hidden');
};

initProgressBar(); 
btnSpin.onclick = triggerSpin;

createInitialGrid();
updateUI();
