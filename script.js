let sequence = [];
let currentIndex = 0;
let pulseCount = 0;

const seqInput = document.getElementById('seqInput');
const loadBtn = document.getElementById('loadBtn');
const randomBtn = document.getElementById('randomBtn');
const clockBtn = document.getElementById('clockBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMsg = document.getElementById('statusMsg');
const nodeRing = document.getElementById('nodeRing');
const coreValue = document.getElementById('coreValue');
const coreDec = document.getElementById('coreDec');
const stream = document.getElementById('stream');
const nextStateEl = document.getElementById('nextState');
const pulseCountEl = document.getElementById('pulseCount');
const seqLenEl = document.getElementById('seqLen');
const activeRatioEl = document.getElementById('activeRatio');
const transTableBody = document.getElementById('transTableBody');

function isValid4Bit(str) { return /^[01]{4}$/.test(str); }

function buildNodes() {
  document.querySelectorAll('.node').forEach(n => n.remove());
  const radius = 140;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * 2 * Math.PI - Math.PI / 2;
    const x = 160 + radius * Math.cos(angle) - 17;
    const y = 160 + radius * Math.sin(angle) - 17;
    const bin = i.toString(2).padStart(4, '0');
    const node = document.createElement('div');
    node.className = 'node';
    node.id = 'node-' + bin;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.textContent = bin;
    nodeRing.appendChild(node);
  }
}
buildNodes();

loadBtn.addEventListener('click', () => {
  const parts = seqInput.value.trim().split(',').map(s => s.trim()).filter(Boolean);

  if (parts.length < 2) { statusMsg.textContent = 'Error: enter at least 2 states.'; return; }
  for (let p of parts) {
    if (!isValid4Bit(p)) { statusMsg.textContent = `Error: "${p}" is not valid 4-bit binary.`; return; }
  }
  if (new Set(parts).size !== parts.length) { statusMsg.textContent = 'Error: duplicate states not allowed.'; return; }

  sequence = parts;
  currentIndex = 0;
  pulseCount = 0;
  statusMsg.textContent = 'Sequence loaded.';
  clockBtn.disabled = false;
  resetBtn.disabled = false;

  document.querySelectorAll('.node').forEach(n => n.classList.remove('in-seq', 'current'));
  sequence.forEach(bin => {
    const n = document.getElementById('node-' + bin);
    if (n) n.classList.add('in-seq');
  });

  seqLenEl.textContent = sequence.length;
  activeRatioEl.textContent = `${sequence.length} / 16`;

  updateDisplay();
  buildTransitionTable();
});

randomBtn.addEventListener('click', () => {
  const count = Math.floor(Math.random() * 3) + 4;
  const pool = [];
  for (let i = 0; i < 16; i++) pool.push(i.toString(2).padStart(4, '0'));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  seqInput.value = pool.slice(0, count).join(',');
  loadBtn.click();
});

clockBtn.addEventListener('click', () => {
  const prevBin = sequence[currentIndex];
  const prevNode = document.getElementById('node-' + prevBin);
  if (prevNode) prevNode.classList.remove('current');

  currentIndex = (currentIndex + 1) % sequence.length;
  pulseCount++;

  updateDisplay();

  const core = document.getElementById('core');
  core.style.boxShadow = '0 0 18px rgba(167,139,250,0.5)';
  setTimeout(() => { core.style.boxShadow = ''; }, 300);
});

resetBtn.addEventListener('click', () => {
  document.querySelectorAll('.node').forEach(n => n.classList.remove('current'));
  currentIndex = 0;
  pulseCount = 0;
  updateDisplay();
  statusMsg.textContent = 'Reset to initial state.';
});

function updateDisplay() {
  const current = sequence[currentIndex];
  const next = sequence[(currentIndex + 1) % sequence.length];

  document.querySelectorAll('.node').forEach(n => n.classList.remove('current'));
  const curNode = document.getElementById('node-' + current);
  if (curNode) {
    curNode.classList.add('current', 'flash');
    setTimeout(() => curNode.classList.remove('flash'), 500);
  }

  coreValue.textContent = current;
  coreDec.textContent = parseInt(current, 2);
  stream.textContent = current.split('').join(' ');
  nextStateEl.textContent = next;
  pulseCountEl.textContent = pulseCount;
}

function buildTransitionTable() {
  transTableBody.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const bin = i.toString(2).padStart(4, '0');
    const pos = sequence.indexOf(bin);
    const row = document.createElement('tr');
    if (pos !== -1) {
      const next = sequence[(pos + 1) % sequence.length];
      row.className = 'valid-row';
      row.innerHTML = `<td>${bin}</td><td>${i}</td><td>${next}</td><td>Valid</td>`;
    } else {
      row.className = 'invalid-row';
      row.innerHTML = `<td>${bin}</td><td>${i}</td><td>—</td><td>Unused</td>`;
    }
    transTableBody.appendChild(row);
  }
}