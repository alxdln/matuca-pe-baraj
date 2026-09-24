/* =========================================================================
   CONFIGURAȚIE SIMBOLURI & LINII DE PLATĂ
   ========================================================================= */
const SYMBOLS = {
  10:       { name: '10',         type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🔟' },
  J:        { name: 'J',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🎣' },
  Q:        { name: 'Q',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🪱' },
  K:        { name: 'K',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🍺' },
  A:        { name: 'A',          type: 'low',     mult: [0, 0, 0.5, 2, 5], emoji: '🛶' },
  ALBITURI: { name: 'Albituri',   type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐟', money: [1, 2.5] },
  CARAS:    { name: 'Caras',      type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐠', money: [5, 7.5, 10] },
  CLEAN:    { name: 'Clean',      type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🐡', money: [12.5, 25] },
  CRAP:     { name: 'Crap',       type: 'fish',    mult: [0, 0, 1, 3, 10],  emoji: '🦈', money: [50, 100, 250] },
  TONCEA:   { name: 'Toncea 👮',  type: 'char',    mult: [0, 0, 0, 0, 0],   emoji: '👮‍♂️', file: 'assets/toncea.png' },
  LUPU:     { name: 'Dr. Lupu 🩺', type: 'char',   mult: [0, 0, 0, 0, 0],   emoji: '👨‍⚕️', file: 'assets/lupu.png' },
  SCATTER:  { name: 'Gogoașă', type: 'scatter', mult: [0, 0, 0, 0, 0],   emoji: '🍩', file: 'assets/gogoasa.png' },
  MATUCA:   { name: 'Mațuca 🎣',  type: 'wild',    mult: [0, 0, 0, 0, 0],   emoji: '🧔', file: 'assets/matuca.png' }
};

const PAYLINES = [
  [1, 1, 1, 1, 1], // Centru
  [0, 0, 0, 0, 0], // Sus
  [2, 2, 2, 2, 2], // Jos
  [0, 1, 2, 1, 0], // V
  [2, 1, 0, 1, 2], // V inversat
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 2, 2, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0]
];

/* =========================================================================
   STARE JOC & WEB AUDIO API
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
  const mults = ['1x', '2x', '3x', '5x', '10x'];
  
  for(let i=0; i<5; i++) {
    const tag = document.createElement('div');
    tag.className = 'multiplier-tag' + (i === 0 ? ' active' : '');
    tag.id = 'mult-' + i;
    tag.innerText = mults[i];
    trail.appendChild(tag);
    
    if (i < 4) {
      const group = document.createElement('div');
      group.className = 'trail-group';
      for(let j=1; j<=5; j++) {
        const icon = document.createElement('img');
        icon.src = 'assets/matuca.png';
        icon.className = 'trail-icon';
        icon.id = 'mat-icon-' + (i * 5 + j);
        group.appendChild(icon);
      }
      trail.appendChild(group);
    }
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

  let moneyTag = '';
  let labelClass = symKey === 'SCATTER' ? 'cell-label scatter-label' : 'cell-label';
  let labelTag = '\x3Cspan class="' + labelClass + '"\x3E' + sym.name + '\x3C/span\x3E';

  if (moneyVal) {
    moneyTag = '\x3Cdiv class="money-tag"\x3E' + (moneyVal * currentBet) + '\x3C/div\x3E';
    labelTag = ''; 
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
    if (rand < 3.5) return 'MATUCA';   
    if (fsLevel >= 1 && rand < 6.5) return 'TONCEA';   
    
    if (rand < 9.5) return 'CRAP';    
    if (rand < 13.5) return 'CLEAN';   
    if (rand < 18.5) return 'CARAS';   
    if (rand < 28) return 'ALBITURI';
  } else {
    if (rand < 7) return 'SCATTER';  
    
    if (rand < 13) return 'CRAP';    
    if (rand < 21) return 'CLEAN';   
    if (rand < 31) return 'CARAS';   
    if (rand < 50) return 'ALBITURI';
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
  
  btnSpin.disabled = false;
  btnSpin.innerText = 'STOP';
  btnSpin.style.background = 'radial-gradient(circle, #ff9900 0%, #aa4400 100%)';

  if (!isFreeSpins) {
    balance -= currentBet;
    updateUI();
  } else {
    fsRemaining--;
    fsCountEl.innerText = fsRemaining;
  }

  winEl.innerText = "0.00";
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
          if (matucasInGrid === 3 && Math.random() < 0.95) { 
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

  const baseDuration = isTurbo ? 140 : 250;
  let promises = [];
  
  for (let c = 0; c < 5; c++) {
    let stagger = c * (isTurbo ? 50 : 150);
    promises.push(animateReel(c, matrix[c], moneyMatrix[c], baseDuration + stagger));
  }

  await Promise.all(promises);

  btnSpin.disabled = true;
  btnSpin.innerText = '...';
  btnSpin.style.background = '';

  await evaluateRound(matrix, moneyMatrix);
}

function animateReel(colIdx, symbols, moneys, duration) {
  return new Promise(function(resolve) {
    const reel = document.getElementById('reel-' + colIdx);
    playSfx('spin');
    reel.style.filter = 'blur(2px)';

    let resolved = false;
    let timeoutId;

    const stopFn = function() {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      reel.innerHTML = '';
      for (let r = 0; r < 3; r++) {
        reel.appendChild(renderCell(symbols[r], moneys[r]));
      }
      reel.style.filter = 'none';
      resolve();
    };

    activeSpins.push(stopFn);
    timeoutId = setTimeout(stopFn, duration);
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
  }

  if (totalSpinWin > 0) {
    balance += totalSpinWin;
    winEl.innerText = totalSpinWin.toFixed(2);
    playSfx('win');
    if (!isFreeSpins) statusEl.innerText = 'Câștig pe linie: +' + totalSpinWin.toFixed(2) + ' Lei!';
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
   SPECIALĂ & MECANICA DE ÎNEC CU DR. LUPU
   ========================================================================= */
function startFreeSpins() {
  isFreeSpins = true;
  matucaCount = 0;
  fsLevel = 0;
  fsTotalWin = 0; 
  fsBar.classList.remove('hidden');
  fsCountEl.innerText = fsRemaining;
  
  for(let i=1; i<=20; i++) {
    let icon = document.getElementById('mat-icon-' + i);
    if(icon) icon.classList.remove('collected');
  }
  activateMultTag(0);
  
  isSpinning = false;
  btnSpin.disabled = false;
  btnSpin.innerText = 'LANSEAZĂ';
}

function updateCollectorProgress() {
  for (let i = 1; i <= Math.min(matucaCount, 20); i++) {
    let icon = document.getElementById('mat-icon-' + i);
    if (icon && !icon.classList.contains('collected')) {
      icon.classList.add('collected');
    }
  }

  if (matucaCount >= 20 && fsLevel < 4) {
    fsLevel = 4;
    fsRemaining += 10;
    activateMultTag(4);
    showEventModal('🔥', 'MAȚUCA 10X!', 'Nivel Maxim pe Baraj! +10 Rotiri cu Multiplicator 10x!');
  } else if (matucaCount >= 15 && fsLevel < 3) {
    fsLevel = 3;
    fsRemaining += 10;
    activateMultTag(3);
    showEventModal('⭐', 'MAȚUCA 5X!', 'Nivelul 3 atins! +10 Rotiri cu Multiplicator 5x!');
  } else if (matucaCount >= 10 && fsLevel < 2) {
    fsLevel = 2;
    fsRemaining += 10;
    activateMultTag(2);
    showEventModal('⚡', 'MAȚUCA 3X!', 'Nivelul 2 atins! +10 Rotiri cu Multiplicator 3x!');
  } else if (matucaCount >= 5 && fsLevel < 1) {
    fsLevel = 1;
    fsRemaining += 10;
    activateMultTag(1);
    showEventModal('🎣', 'MAȚUCA 2X!', 'Primul prag atins! +10 Rotiri cu Multiplicator 2x!');
  }

  fsCountEl.innerText = fsRemaining;
}

function activateMultTag(level) {
  for(let i=0; i<=4; i++) {
    let tag = document.getElementById('mult-' + i);
    if(tag) {
      if (i <= level) tag.classList.add('active');
      else tag.classList.remove('active');
    }
  }
}

async function handleEndOfFreeSpins() {
  await new Promise(function(r) { setTimeout(r, 1000); });

  if (matucaCount < 5) {
    await showEventModal('assets/matuca.png', 'MAȚUCA SE ÎNEACĂ!', 'Nu a atins pragul și a căzut de pe baraj în apă!');

    const doctorSaves = Math.random() < 0.5;

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
      await showEventModal('⚰️', 'A ÎNGHIȚIT PREA MULTĂ APĂ...', 'Dr. Lupu nu a ajuns la timp. Câștig total în specială: ' + fsTotalWin.toFixed(2) + ' Lei!');
    }
  } else {
    await showEventModal('🏆', 'PARTIDĂ FINALIZATĂ!', 'Felicitări! Câștig total în specială: ' + fsTotalWin.toFixed(2) + ' Lei!');
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