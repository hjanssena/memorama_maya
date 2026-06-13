// ---------------------------------------------------------------------------
// Memorama Maya — game logic
// Depends on PAIRS (defined in data.js).
// ---------------------------------------------------------------------------

const FLIP_BACK_DELAY = 800; // ms a non-matching pair stays visible

// --- Game state ------------------------------------------------------------
let flipped = [];        // DOM card elements currently face-up & unmatched (max 2)
let matchedCount = 0;    // pairs found  -> "Aciertos"
let tries = 0;           // completed attempts (2nd card revealed) -> "Intentos"
let lock = false;        // input lock during the non-match flip-back animation

const CARD_RATIO = 3 / 4; // card width : height (matches .card aspect-ratio)

// --- DOM references --------------------------------------------------------
const mainEl    = document.querySelector("main");
const boardEl   = document.getElementById("board");
const matchesEl = document.getElementById("matches");
const triesEl   = document.getElementById("tries");
const modalEl   = document.getElementById("win-modal");
const finalTriesEl = document.getElementById("final-tries");
document.getElementById("refresh-btn").addEventListener("click", () => location.reload());

// --- Helpers ---------------------------------------------------------------

// Size the board so all cards fit within the available width AND height.
// Tries every column count and keeps the one that yields the largest card,
// then sets the grid to that many columns and the matching board width — so
// the cards scale down and spread across the horizontal space as needed.
function layoutBoard() {
  const n = PAIRS.length * 2; // total cards (30)

  const boardStyles = getComputedStyle(boardEl);
  const gap = parseFloat(boardStyles.rowGap) || 0;

  // Available area = main's content box (clientWidth/Height exclude scrollbar).
  const mainStyles = getComputedStyle(mainEl);
  const availW = mainEl.clientWidth
    - parseFloat(mainStyles.paddingLeft) - parseFloat(mainStyles.paddingRight);
  const availH = mainEl.clientHeight
    - parseFloat(mainStyles.paddingTop) - parseFloat(mainStyles.paddingBottom);
  if (availW <= 0 || availH <= 0) return;

  let best = { cols: 1, cardW: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = (availH - gap * (rows - 1)) / rows;
    if (cellW <= 0 || cellH <= 0) continue;
    // Card width is limited by the cell width and by the cell height via ratio.
    const cardW = Math.min(cellW, cellH * CARD_RATIO);
    if (cardW > best.cardW) best = { cols, cardW };
  }

  boardEl.style.maxWidth = "none";
  boardEl.style.gridTemplateColumns = `repeat(${best.cols}, 1fr)`;
  boardEl.style.width = `${best.cols * best.cardW + gap * (best.cols - 1)}px`;
}

// Fisher–Yates shuffle (in place).
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Build the 30-card deck: two identical cards (image + word) per pair.
function buildDeck() {
  const deck = [];
  for (const pair of PAIRS) {
    deck.push({ id: pair.id, word: pair.word, img: pair.img });
    deck.push({ id: pair.id, word: pair.word, img: pair.img });
  }
  return shuffle(deck);
}

// Create the DOM element for a single card: image on top, word below.
function createCardEl(card) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.id = card.id;

  // If the image file is missing, swap in a labeled placeholder.
  const imgHtml =
    `<img src="${card.img}" alt="${card.word}" ` +
    `onerror="this.replaceWith(Object.assign(document.createElement('div'),` +
    `{className:'img-placeholder',innerHTML:'<span class=&quot;ph-icon&quot;>🖼️</span>'}))">`;

  el.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back"></div>
      <div class="card-face card-front">
        <div class="card-img">${imgHtml}</div>
        <span class="word">${card.word}</span>
      </div>
    </div>`;

  el.addEventListener("click", () => onCardClick(el));
  return el;
}

// --- Game flow -------------------------------------------------------------

function onCardClick(el) {
  // Ignore clicks during lock, on already-flipped, or on matched cards.
  if (lock) return;
  if (el.classList.contains("is-flipped")) return;
  if (el.classList.contains("is-matched")) return;

  el.classList.add("is-flipped");
  flipped.push(el);

  if (flipped.length === 2) {
    tries++;
    triesEl.textContent = tries;
    checkMatch();
  }
}

function checkMatch() {
  const [a, b] = flipped;
  const isMatch = a.dataset.id === b.dataset.id;

  if (isMatch) {
    a.classList.add("is-matched");
    b.classList.add("is-matched");
    flipped = [];
    matchedCount++;
    matchesEl.textContent = matchedCount;
    if (matchedCount === PAIRS.length) showWin();
  } else {
    // Wrong guess: lock input, flip both back after a short delay.
    lock = true;
    setTimeout(() => {
      a.classList.remove("is-flipped");
      b.classList.remove("is-flipped");
      flipped = [];
      lock = false;
    }, FLIP_BACK_DELAY);
  }
}

function showWin() {
  finalTriesEl.textContent = tries;
  modalEl.classList.remove("hidden");
}

// --- Init (runs on every page load -> new random order) --------------------
function init() {
  const deck = buildDeck();
  const frag = document.createDocumentFragment();
  for (const card of deck) frag.appendChild(createCardEl(card));
  boardEl.appendChild(frag);
  layoutBoard();
}

// Recompute the fit whenever the available area changes (resize, rotate,
// mobile chrome show/hide). ResizeObserver catches all of these.
new ResizeObserver(layoutBoard).observe(mainEl);

init();
