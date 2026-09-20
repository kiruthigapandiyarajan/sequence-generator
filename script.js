"use strict";

/* =========================================================
   DIGITAL ELECTRONICS LOGIC
   ========================================================= */

const JK_TRUTH = [
  { J: 0, K: 0, Q: 0, next: 0, op: "HOLD" },
  { J: 0, K: 0, Q: 1, next: 1, op: "HOLD" },
  { J: 0, K: 1, Q: 0, next: 0, op: "RESET" },
  { J: 0, K: 1, Q: 1, next: 0, op: "RESET" },
  { J: 1, K: 0, Q: 0, next: 1, op: "SET" },
  { J: 1, K: 0, Q: 1, next: 1, op: "SET" },
  { J: 1, K: 1, Q: 0, next: 1, op: "TOGGLE" },
  { J: 1, K: 1, Q: 1, next: 0, op: "TOGGLE" }
];

function jkNext(J, K, Q) {
  if (J === 0 && K === 0) return Q;
  if (J === 0 && K === 1) return 0;
  if (J === 1 && K === 0) return 1;
  return Q ? 0 : 1;
}

function jkOperation(J, K) {
  if (J === 0 && K === 0) return "HOLD";
  if (J === 0 && K === 1) return "RESET";
  if (J === 1 && K === 0) return "SET";
  return "TOGGLE";
}

function jkExplanation(J, K, Q) {
  const next = jkNext(J, K, Q);

  if (J === 0 && K === 0)
    return `J=0 and K=0 selects the HOLD condition, so Q(t+1) remains ${Q}.`;

  if (J === 0 && K === 1)
    return `K=1 with J=0 resets the flip-flop, therefore Q(t+1)=0.`;

  if (J === 1 && K === 0)
    return `J=1 with K=0 sets the flip-flop, therefore Q(t+1)=1.`;

  return `J=1 and K=1 selects TOGGLE, so the present state ${Q} changes to ${next}.`;
}


/* =========================================================
   COUNTER
   One consistent 4-bit random sequence
   ========================================================= */

const COUNTER_SEQUENCE = [
  0, 3, 5, 6, 9, 12, 10, 15
];

const COUNTER_TRANSITIONS = {};

COUNTER_SEQUENCE.forEach((state, index) => {
  COUNTER_TRANSITIONS[state] =
    COUNTER_SEQUENCE[(index + 1) % COUNTER_SEQUENCE.length];
});

/*
 Unused states are sent to 0000.
 This makes the counter self-starting if it enters an unused state.
*/
for (let s = 0; s < 16; s++) {
  if (COUNTER_TRANSITIONS[s] === undefined) {
    COUNTER_TRANSITIONS[s] = 0;
  }
}

function bits4(n) {
  return [
    (n >> 3) & 1,
    (n >> 2) & 1,
    (n >> 1) & 1,
    n & 1
  ];
}

function binary4(n) {
  return n.toString(2).padStart(4, "0");
}

function counterNext(state) {
  return COUNTER_TRANSITIONS[state];
}

function excitation(q, next) {
  if (q === 0 && next === 0) return { J: "0", K: "X" };
  if (q === 0 && next === 1) return { J: "1", K: "X" };
  if (q === 1 && next === 0) return { J: "X", K: "1" };
  return { J: "X", K: "0" };
}

function counterFunctionData(bit, type) {
  const ones = [];
  const dcs = [];

  for (let state = 0; state < 16; state++) {
    const next = counterNext(state);
    const q = (state >> bit) & 1;
    const nq = (next >> bit) & 1;
    const ex = excitation(q, nq);

    const value = type === "J" ? ex.J : ex.K;

    if (value === "1") ones.push(state);
    if (value === "X") dcs.push(state);
  }

  return { ones, dcs };
}


/* =========================================================
   BOOLEAN SIMPLIFICATION
   Exact 4-variable implicant search.
   Variables are Q3,Q2,Q1,Q0.
   ========================================================= */

const VARIABLES = ["Q3", "Q2", "Q1", "Q0"];

function patternCovers(pattern, minterm) {
  for (let i = 0; i < 4; i++) {
    if (pattern[i] === -1) continue;

    const bit = (minterm >> (3 - i)) & 1;

    if (bit !== pattern[i]) return false;
  }

  return true;
}

function patternCells(pattern) {
  const result = [];

  for (let m = 0; m < 16; m++) {
    if (patternCovers(pattern, m)) result.push(m);
  }

  return result;
}

function allPatterns() {
  const patterns = [];

  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      for (let c = -1; c <= 1; c++) {
        for (let d = -1; d <= 1; d++) {
          patterns.push([a, b, c, d]);
        }
      }
    }
  }

  return patterns;
}

function literalCount(pattern) {
  return pattern.filter(x => x !== -1).length;
}

function patternTerm(pattern) {
  const parts = [];

  pattern.forEach((value, i) => {
    if (value === -1) return;
    parts.push(VARIABLES[i] + (value === 0 ? "'" : ""));
  });

  return parts.length ? parts.join("") : "1";
}

function primeImplicants(ones, dcs) {
  const allowed = new Set([...ones, ...dcs]);
  const valid = [];

  for (const pattern of allPatterns()) {
    const cells = patternCells(pattern);

    if (cells.length === 0) continue;

    if (!cells.every(m => allowed.has(m))) continue;

    if (!cells.some(m => ones.includes(m))) continue;

    valid.push({
      pattern,
      cells,
      coveredOnes: cells.filter(m => ones.includes(m))
    });
  }

  return valid.filter(candidate => {
    return !valid.some(other => {
      if (other === candidate) return false;

      if (literalCount(other.pattern) >= literalCount(candidate.pattern))
        return false;

      return candidate.cells.every(m => other.cells.includes(m));
    });
  });
}

function simplifyBoolean(ones, dcs) {
  ones = [...new Set(ones)].sort((a, b) => a - b);
  dcs = [...new Set(dcs)].sort((a, b) => a - b);

  if (ones.length === 0) return "0";

  if (ones.length === 16) return "1";

  const primes = primeImplicants(ones, dcs);

  let best = null;

  function search(start, chosen, covered, literalTotal) {
    if (covered.size === ones.length) {
      const terms = chosen.map(x => patternTerm(x.pattern));
      const score = [chosen.length, literalTotal];

      if (
        best === null ||
        score[0] < best.score[0] ||
        (score[0] === best.score[0] && score[1] < best.score[1])
      ) {
        best = { score, chosen: [...chosen], terms };
      }

      return;
    }

    if (chosen.length >= 8) return;

    let uncovered = ones.filter(m => !covered.has(m));

    let candidateIndices = [];

    for (let i = start; i < primes.length; i++) {
      if (uncovered.some(m => primes[i].coveredOnes.includes(m))) {
        candidateIndices.push(i);
      }
    }

    for (const i of candidateIndices) {
      const p = primes[i];

      const newCovered = new Set(covered);

      p.coveredOnes.forEach(m => newCovered.add(m));

      search(
        i + 1,
        [...chosen, p],
        newCovered,
        literalTotal + literalCount(p.pattern)
      );
    }
  }

  search(0, [], new Set(), 0);

  if (!best) return "Cannot simplify";

  return best.terms.join(" + ");
}


/* =========================================================
   K-MAP DATA
   ========================================================= */

const GRAY = [0, 1, 3, 2];

function map4Index(row, col) {
  return (GRAY[row] << 2) | GRAY[col];
}

function map2Index(row, col) {
  return (GRAY[row] << 1) | GRAY[col];
}

function kmap4Values(ones, dcs) {
  const values = [];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const m = map4Index(r, c);

      if (ones.includes(m)) values.push("1");
      else if (dcs.includes(m)) values.push("X");
      else values.push("0");
    }
  }

  return values;
}

function kmap2Values(ones, dcs) {
  const values = [];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const m = map2Index(r, c);

      if (ones.includes(m)) values.push("1");
      else if (dcs.includes(m)) values.push("X");
      else values.push("0");
    }
  }

  return values;
}


/* =========================================================
   GROUP VALIDATION
   ========================================================= */

function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function cyclicRange(start, size, total) {
  const result = [];

  for (let i = 0; i < size; i++) {
    result.push((start + i) % total);
  }

  return result;
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;

  const A = new Set(a);
  return b.every(x => A.has(x));
}

function possibleRectangleSets(rows, cols, count) {
  const results = [];

  for (let height = 1; height <= rows; height++) {
    for (let width = 1; width <= cols; width++) {
      if (height * width !== count) continue;

      for (let rs = 0; rs < rows; rs++) {
        const rr = cyclicRange(rs, height, rows);

        for (let cs = 0; cs < cols; cs++) {
          const cc = cyclicRange(cs, width, cols);

          const cells = [];

          rr.forEach(r => {
            cc.forEach(c => {
              cells.push(r * cols + c);
            });
          });

          results.push(cells);
        }
      }
    }
  }

  return results;
}

function groupMinterms4(indices) {
  return indices.map(i => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return map4Index(row, col);
  });
}

function groupMinterms2(indices) {
  return indices.map(i => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    return map2Index(row, col);
  });
}

function termFromGroup(minterms, variableCount) {
  if (variableCount === 2) {
    const vals = minterms.map(m => [
      (m >> 1) & 1,
      m & 1
    ]);

    const names = ["Q(t)", "Q(t+1)"];
    const result = [];

    for (let i = 0; i < 2; i++) {
      if (vals.every(v => v[i] === 0)) result.push(names[i] + "'");
      if (vals.every(v => v[i] === 1)) result.push(names[i]);
    }

    return result.join("") || "1";
  }

  const result = [];

  for (let bit = 3; bit >= 0; bit--) {
    const vals = minterms.map(m => (m >> bit) & 1);

    if (vals.every(v => v === 0))
      result.push(VARIABLES[3 - bit] + "'");

    if (vals.every(v => v === 1))
      result.push(VARIABLES[3 - bit]);
  }

  return result.join("") || "1";
}

function validateGroup(selected, displayedValues, requiredOnes, dcs, size) {
  if (!selected.length) {
    return {
      valid: false,
      message: "Select cells before pressing FINISH GROUP."
    };
  }

  if (!isPowerOfTwo(selected.length)) {
    return {
      valid: false,
      message: "A K-map group must contain a power-of-two number of cells: 1, 2, 4, 8, 16, etc."
    };
  }

  const rows = size === 2 ? 2 : 4;
  const cols = rows;

  const possible = possibleRectangleSets(rows, cols, selected.length);

  const shapeOK = possible.some(x => sameSet(x, selected));

  if (!shapeOK) {
    return {
      valid: false,
      message:
        "The selected cells do not form a valid rectangular K-map group. Use horizontal, vertical, or wrap-around adjacency. Diagonal-only grouping is not allowed."
    };
  }

  const minterms =
    size === 2
      ? groupMinterms2(selected)
      : groupMinterms4(selected);

  if (!minterms.some(m => requiredOnes.includes(m))) {
    return {
      valid: false,
      message: "A valid group must contain at least one required 1/minterm."
    };
  }

  const containsZero = minterms.some(m =>
    !requiredOnes.includes(m) && !dcs.includes(m)
  );

  if (containsZero) {
    return {
      valid: false,
      message: "The group contains a 0 cell. Groups may contain required 1s and Don't Care cells, but not 0s."
    };
  }

  const wrongDisplayed = selected.some(i => {
    const value = displayedValues[i];
    return value !== "1" && value !== "X";
  });

  if (wrongDisplayed) {
    return {
      valid: false,
      message: "Fill the selected K-map cells correctly before grouping them."
    };
  }

  return {
    valid: true,
    minterms,
    term: termFromGroup(minterms, size)
  };
}


/* =========================================================
   APP STATE
   ========================================================= */

let page = "home";

const jkSim = {
  J: 0,
  K: 0,
  Q: 0
};

const counterState = {
  current: 0,
  autoTimer: null
};

const kmapStates = {};

let quizState = {
  questions: [],
  index: 0,
  score: 0,
  answered: false,
  selected: null
};


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(name) {
  page = name;
  window.scrollTo(0, 0);
  render();
}


/* =========================================================
   SVG DIAGRAMS
   ========================================================= */

function jkBlockDiagram() {
  return `
  <svg class="diagram" viewBox="0 0 700 300" role="img"
       aria-label="JK Flip-Flop block diagram">
    <rect x="220" y="55" width="260" height="190"
          rx="15" fill="#eef7ff" stroke="#2476c9" stroke-width="4"/>
    <text x="350" y="145" text-anchor="middle"
          font-size="30" font-weight="700" fill="#124d89">JK</text>
    <text x="350" y="180" text-anchor="middle"
          font-size="17" fill="#607890">FLIP-FLOP</text>

    <line x1="80" y1="95" x2="220" y2="95"
          stroke="#124d89" stroke-width="4"/>
    <text x="70" y="87" text-anchor="end"
          font-size="21" font-weight="700" fill="#17324d">J</text>

    <line x1="80" y1="205" x2="220" y2="205"
          stroke="#124d89" stroke-width="4"/>
    <text x="70" y="197" text-anchor="end"
          font-size="21" font-weight="700" fill="#17324d">K</text>

    <line x1="350" y1="255" x2="350" y2="300"
          stroke="#124d89" stroke-width="4"/>
    <polygon points="350,245 340,260 360,260"
             fill="#124d89"/>
    <text x="365" y="291"
          font-size="18" fill="#17324d">CLK</text>

    <line x1="480" y1="105" x2="620" y2="105"
          stroke="#124d89" stroke-width="4"/>
    <text x="635" y="112"
          font-size="21" font-weight="700" fill="#17324d">Q</text>

    <line x1="480" y1="195" x2="620" y2="195"
          stroke="#124d89" stroke-width="4"/>
    <text x="635" y="202"
          font-size="21" font-weight="700" fill="#17324d">Q'</text>
  </svg>`;
}

function jkStateDiagram() {
  return `
  <svg class="diagram" viewBox="0 0 720 390"
       role="img" aria-label="JK Flip-Flop state diagram">

    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10"
              refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#2476c9"/>
      </marker>
    </defs>

    <circle cx="190" cy="195" r="62"
            fill="#f5fbff" stroke="#2476c9" stroke-width="5"/>
    <text x="190" y="205" text-anchor="middle"
          font-size="30" font-weight="800" fill="#124d89">0</text>

    <circle cx="530" cy="195" r="62"
            fill="#f5fbff" stroke="#2476c9" stroke-width="5"/>
    <text x="530" y="205" text-anchor="middle"
          font-size="30" font-weight="800" fill="#124d89">1</text>

    <path d="M245 150 Q360 70 475 150"
          fill="none" stroke="#2476c9" stroke-width="3"
          marker-end="url(#arrow)"/>
    <text x="360" y="87" text-anchor="middle"
          font-size="17" font-weight="700">JK=10, 11</text>

    <path d="M475 240 Q360 320 245 240"
          fill="none" stroke="#2476c9" stroke-width="3"
          marker-end="url(#arrow)"/>
    <text x="360" y="315" text-anchor="middle"
          font-size="17" font-weight="700">JK=01, 11</text>

    <path d="M145 143 Q85 90 145 90 Q205 90 178 142"
          fill="none" stroke="#2476c9" stroke-width="3"
          marker-end="url(#arrow)"/>
    <text x="105" y="72" text-anchor="middle"
          font-size="15">JK=00, 01</text>

    <path d="M575 143 Q635 90 575 90 Q515 90 542 142"
          fill="none" stroke="#2476c9" stroke-width="3"
          marker-end="url(#arrow)"/>
    <text x="615" y="72" text-anchor="middle"
          font-size="15">JK=00, 10</text>

  </svg>`;
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {
  return `
  <div class="hero">
    <h2>Interactive Digital Electronics Learning Platform</h2>
    <p>
      Learn Digital Electronics through definitions, tables, truth tables,
      state diagrams, excitation tables, interactive K-maps,
      Boolean simplification, circuit/state simulation and questions.
    </p>
  </div>

  <div class="card-grid">

    <button class="learning-card" onclick="showPage('jk')">
      <div class="number">1</div>
      <h3>JK Flip-Flop</h3>
      <p>
        Learn JK operation, truth table, state diagram,
        excitation table, K-map simplification and interactive simulation.
      </p>
    </button>

    <button class="learning-card" onclick="showPage('counter')">
      <div class="number">2</div>
      <h3>4-Bit Random Sequence Counter</h3>
      <p>
        Study a complete 4-bit random sequence counter with
        JK excitation, eight K-maps, equations and clock simulation.
      </p>
    </button>

    <button class="learning-card" onclick="startQuiz()">
      <div class="number">3</div>
      <h3>Question & Answer</h3>
      <p>
        Test your knowledge using multiple-choice, true/false,
        next-state, JK excitation and Boolean-expression questions.
      </p>
    </button>

  </div>

  <div class="section">
    <h2>What You Can Learn</h2>

    <div class="info-grid">
      <div class="info-box">Definitions and engineering terminology</div>
      <div class="info-box">Truth and present/next-state tables</div>
      <div class="info-box">JK excitation tables</div>
      <div class="info-box">State diagrams</div>
      <div class="info-box">Interactive K-map solving</div>
      <div class="info-box">Boolean simplification</div>
      <div class="info-box">Sequential-circuit simulation</div>
      <div class="info-box">Questions, feedback and scoring</div>
    </div>
  </div>`;
}


/* =========================================================
   JK PAGE
   ========================================================= */

function renderJKTruthTable() {
  return `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>J</th>
          <th>K</th>
          <th>Q(t)</th>
          <th>Q(t+1)</th>
          <th>Operation</th>
        </tr>
      </thead>
      <tbody>
        ${JK_TRUTH.map(r => `
          <tr>
            <td>${r.J}</td>
            <td>${r.K}</td>
            <td>${r.Q}</td>
            <td>${r.next}</td>
            <td>${r.op}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderJKSimulator() {
  const next = jkNext(jkSim.J, jkSim.K, jkSim.Q);
  const op = jkOperation(jkSim.J, jkSim.K);

  return `
  <div class="simulator">

    <div class="control-card">
      <strong>J</strong><br>
      <button class="toggle ${jkSim.J ? "on" : ""}"
              onclick="toggleJK('J')">${jkSim.J}</button>
    </div>

    <div class="control-card">
      <strong>K</strong><br>
      <button class="toggle ${jkSim.K ? "on" : ""}"
              onclick="toggleJK('K')">${jkSim.K}</button>
    </div>

    <div class="control-card">
      <strong>Q(t)</strong><br>
      <button class="toggle ${jkSim.Q ? "on" : ""}"
              onclick="toggleJK('Q')">${jkSim.Q}</button>
    </div>

  </div>

  <div class="result-box">
    <div class="info-grid">
      <div><b>J:</b> ${jkSim.J}</div>
      <div><b>K:</b> ${jkSim.K}</div>
      <div><b>Q(t):</b> ${jkSim.Q}</div>
      <div><b>Q(t+1):</b> ${next}</div>
      <div><b>Operation:</b> ${op}</div>
      <div><b>Reason:</b> ${jkExplanation(jkSim.J, jkSim.K, jkSim.Q)}</div>
    </div>
  </div>`;
}

function toggleJK(name) {
  jkSim[name] = jkSim[name] ? 0 : 1;
  render();
}


/* =========================================================
   JK K-MAPS
   ========================================================= */

function initializeKMapState(id, size, ones, dcs) {
  if (kmapStates[id]) return;

  const values = Array(size * size).fill("0");

  kmapStates[id] = {
    size,
    ones,
    dcs,
    values,
    grouping: false,
    selected: [],
    groups: [],
    feedback: null
  };
}

function handleKMapCell(id, index, event) {
  event.preventDefault();

  const state = kmapStates[id];
  if (!state) return;

  if (state.grouping) {
    const pos = state.selected.indexOf(index);

    if (pos >= 0) state.selected.splice(pos, 1);
    else state.selected.push(index);

    render();
    return;
  }

  clearTimeout(state.tapTimer);

  if (event.detail >= 2) {
    state.values[index] = "X";
    render();
    return;
  }

  state.tapTimer = setTimeout(() => {
    state.values[index] =
      state.values[index] === "1" ? "0" : "1";

    render();
  }, 220);
}

function startGrouping(id) {
  const state = kmapStates[id];

  state.grouping = true;
  state.selected = [];
  state.feedback = null;

  render();
}

function finishGrouping(id) {
  const state = kmapStates[id];

  const result = validateGroup(
    state.selected,
    state.values,
    state.ones,
    state.dcs,
    state.size
  );

  if (result.valid) {
    state.groups.push({
      cells: [...state.selected],
      minterms: result.minterms,
      term: result.term
    });

    state.feedback = {
      type: "correct",
      text:
        `<b>Correct grouping!</b><br>
         Selected cells: ${state.selected.join(", ")}<br>
         Minterms: ${result.minterms.join(", ")}<br>
         Simplified term represented by this group:
         <strong>${result.term}</strong>`
    };

    state.selected = [];
    state.grouping = false;
  } else {
    state.feedback = {
      type: "incorrect",
      text:
        `<b>Incorrect grouping.</b><br>
         Make a correct grouping.<br>
         <span>${result.message}</span>`
    };
  }

  render();
}

function renderKMap(id, title, variables, size, ones, dcs) {
  initializeKMapState(id, size, ones, dcs);

  const state = kmapStates[id];

  const rows = size === 2 ? 2 : 4;
  const cols = rows;

  let header = "";

  if (size === 2) {
    header = `
      <tr>
        <th rowspan="2">Q(t)</th>
        <th colspan="2">Q(t+1)</th>
      </tr>
      <tr>
        <th>0</th>
        <th>1</th>
      </tr>`;
  } else {
    header = `
      <tr>
        <th rowspan="2">Q3Q2 \\ Q1Q0</th>
        <th colspan="4">Columns (Gray Code)</th>
      </tr>
      <tr>
        <th>00</th>
        <th>01</th>
        <th>11</th>
        <th>10</th>
      </tr>`;
  }

  let body = "";

  for (let r = 0; r < rows; r++) {
    body += "<tr>";

    body += `<th>${
      size === 2
        ? r
        : ["00", "01", "11", "10"][r]
    }</th>`;

    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const value = state.values[index];

      const classes = [
        value === "1" ? "value-1" : "",
        value === "X" ? "value-X" : "",
        state.selected.includes(index) ? "selected" : ""
      ].join(" ");

      body += `
        <td
          class="${classes}"
          onclick="handleKMapCell('${id}',${index},event)"
          ondblclick="handleKMapCell('${id}',${index},event)"
          title="Click to toggle 0/1. Double-tap for X."
        >${value}</td>`;
    }

    body += "</tr>";
  }

  const allGroups = state.groups
    .map((g, i) =>
      `<div class="small">
        Group ${i + 1}: minterms
        ${g.minterms.join(", ")}
        → <strong>${g.term}</strong>
      </div>`
    ).join("");

  const complete =
    ones.every(m => {
      const covered = state.groups.some(g =>
        g.minterms.includes(m)
      );
      return covered;
    });

  let finalExpression = "";

  if (complete) {
    const terms = state.groups.map(g => g.term);
    finalExpression = [...new Set(terms)].join(" + ");
  }

  return `
  <div class="kmap-card">

    <h3>${title}</h3>

    <p class="small">
      Variables: ${variables.join(", ")}
    </p>

    <p>
      <b>Required minterms:</b>
      ${ones.length ? ones.join(", ") : "None"}
    </p>

    <p>
      <b>Don't Care minterms:</b>
      ${dcs.length ? dcs.join(", ") : "None"}
    </p>

    <div class="kmap-box">
      <table class="kmap">
        ${header}
        ${body}
      </table>
    </div>

    <div class="small">
      Click = 0 → 1 → 0 &nbsp; | &nbsp;
      Double-tap = X (Don't Care)
    </div>

    <div class="kmap-tools">
      <button class="btn btn-primary"
              onclick="startGrouping('${id}')">
        START GROUPING
      </button>

      <button class="btn btn-success"
              onclick="finishGrouping('${id}')">
        FINISH GROUP
      </button>
    </div>

    ${
      state.feedback
        ? `<div class="feedback ${state.feedback.type}">
             ${state.feedback.text}
           </div>`
        : ""
    }

    ${
      allGroups
        ? `<div class="result-box">
             <b>Completed groups</b>
             ${allGroups}
           </div>`
        : ""
    }

    ${
      complete
        ? `<div class="result-box">
             <h4>Final Boolean Result</h4>
             <div class="expression">
               ${finalExpression}
             </div>
             <p>
               The expression is formed from the variables that remain
               constant inside the valid K-map groups.
             </p>
           </div>`
        : ""
    }

  </div>`;
}

function jkKMapSection() {
  const J_ONES = [1];
  const J_DCS = [2, 3];

  const K_ONES = [2];
  const K_DCS = [0, 1];

  return `
  <div class="section">
    <h2>JK Flip-Flop K-Maps</h2>

    <p>
      The JK excitation table uses Q(t) and Q(t+1) as the
      K-map variables.
    </p>

    <div class="info-box">
      <b>J function</b><br>
      Minterm: 1<br>
      Don't Care: 2, 3
      <br><br>
      Therefore:
      <strong>J = Q(t)'Q(t+1)</strong>
    </div>

    ${renderKMap(
      "jk-j",
      "JK K-Map — J",
      ["Q(t)", "Q(t+1)"],
      2,
      J_ONES,
      J_DCS
    )}

    <div class="info-box">
      <b>K function</b><br>
      Minterm: 2<br>
      Don't Care: 0, 1
      <br><br>
      Therefore:
      <strong>K = Q(t)Q(t+1)'</strong>
    </div>

    ${renderKMap(
      "jk-k",
      "JK K-Map — K",
      ["Q(t)", "Q(t+1)"],
      2,
      K_ONES,
      K_DCS
    )}
  </div>`;
}

function renderJK() {
  return `
  <div class="hero">
    <span class="badge">SECTION 1</span>
    <h2>JK Flip-Flop</h2>
    <p>
      Learn the operation, state transitions, excitation requirements,
      K-map simplification and interactive behavior of a JK flip-flop.
    </p>
  </div>

  <div class="section">
    <h2>1. JK Flip-Flop Definition</h2>

    <p>
      A flip-flop is a bistable sequential circuit capable of storing
      one binary bit of information.
    </p>

    <p>
      A JK flip-flop is a clock-controlled bistable device with two
      control inputs, J and K. It has two outputs: Q and Q'.
    </p>

    <div class="info-grid">
      <div class="info-box"><b>J</b> — set/control input</div>
      <div class="info-box"><b>K</b> — reset/control input</div>
      <div class="info-box"><b>Q</b> — normal output</div>
      <div class="info-box"><b>Q'</b> — complement output</div>
      <div class="info-box"><b>Clock</b> — controls state update</div>
      <div class="info-box"><b>Toggle</b> — when J=1 and K=1</div>
    </div>

    <h3>Four basic operating conditions</h3>
    <ul>
      <li>J=0, K=0 → HOLD</li>
      <li>J=0, K=1 → RESET</li>
      <li>J=1, K=0 → SET</li>
      <li>J=1, K=1 → TOGGLE</li>
    </ul>
  </div>

  <div class="section">
    <h2>2. JK Flip-Flop Block Diagram</h2>
    ${jkBlockDiagram()}
  </div>

  <div class="section">
    <h2>3. JK Flip-Flop Truth Table</h2>
    ${renderJKTruthTable()}
  </div>

  <div class="section">
    <h2>4. Interactive JK Truth Table Simulator</h2>
    ${renderJKSimulator()}
  </div>

  <div class="section">
    <h2>5. State Diagram</h2>
    ${jkStateDiagram()}
    <div class="info-box">
      From state 0:
      JK=00 or 01 remains at 0.
      JK=10 or 11 moves to 1.
      <br><br>
      From state 1:
      JK=00 or 10 remains at 1.
      JK=01 or 11 moves to 0.
    </div>
  </div>

  <div class="section">
    <h2>6. Present State / Next State Table</h2>
    ${renderJKTruthTable()}
  </div>

  <div class="section">
    <h2>7. JK Excitation Table</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Q(t)</th>
            <th>Q(t+1)</th>
            <th>J</th>
            <th>K</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0</td><td>0</td><td>0</td><td>X</td></tr>
          <tr><td>0</td><td>1</td><td>1</td><td>X</td></tr>
          <tr><td>1</td><td>0</td><td>X</td><td>1</td></tr>
          <tr><td>1</td><td>1</td><td>X</td><td>0</td></tr>
        </tbody>
      </table>
    </div>

    <p>
      <b>X = Don't Care.</b>
      The corresponding input may be either 0 or 1 without changing
      the required transition.
    </p>
  </div>

  ${jkKMapSection()}

  <div class="section">
    <h2>JK Final Boolean Results</h2>

    <div class="expression">
      J = Q(t)'Q(t+1)
    </div>

    <br>

    <div class="expression">
      K = Q(t)Q(t+1)'
    </div>

    <p>
      These equations come directly from the JK excitation table
      and the corresponding K-map groupings.
    </p>
  </div>`;
}


/* =========================================================
   COUNTER PAGE
   ========================================================= */

function renderCounterStateTable() {
  return `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Present State</th>
          <th>Decimal</th>
          <th>Next State</th>
          <th>Next Decimal</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: 16 }, (_, s) => `
          <tr>
            <td>${binary4(s)}</td>
            <td>${s}</td>
            <td>${binary4(counterNext(s))}</td>
            <td>${counterNext(s)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderCounterExcitationTable() {
  return `
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Present</th>
          <th>Next</th>
          <th>J3</th><th>K3</th>
          <th>J2</th><th>K2</th>
          <th>J1</th><th>K1</th>
          <th>J0</th><th>K0</th>
        </tr>
      </thead>

      <tbody>
        ${Array.from({ length: 16 }, (_, s) => {
          const n = counterNext(s);
          const a = bits4(s);
          const b = bits4(n);

          const e3 = excitation(a[0], b[0]);
          const e2 = excitation(a[1], b[1]);
          const e1 = excitation(a[2], b[2]);
          const e0 = excitation(a[3], b[3]);

          return `
          <tr>
            <td>${binary4(s)}</td>
            <td>${binary4(n)}</td>
            <td>${e3.J}</td><td>${e3.K}</td>
            <td>${e2.J}</td><td>${e2.K}</td>
            <td>${e1.J}</td><td>${e1.K}</td>
            <td>${e0.J}</td><td>${e0.K}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function renderCounterSimulator() {
  const current = counterState.current;
  const next = counterNext(current);
  const bits = bits4(current);

  const position = COUNTER_SEQUENCE.indexOf(current);
  const progress = position >= 0
    ? ((position + 1) / COUNTER_SEQUENCE.length) * 100
    : 0;

  return `
  <div class="section">
    <h2>Counter Simulation</h2>

    <div class="center">
      <h3>Present State → Clock Pulse → Next State</h3>

      <div class="state-flow">
        <div>
          <span class="small">Present</span>
          <div class="state-node">${binary4(current)}</div>
        </div>

        <div class="arrow">→</div>

        <div>
          <span class="small">Next</span>
          <div class="state-node">${binary4(next)}</div>
        </div>
      </div>

      <div class="row" style="justify-content:center">
        <button class="btn btn-primary"
                onclick="clockPulse()">
          CLOCK PULSE
        </button>

        <button class="btn btn-danger"
                onclick="resetCounter()">
          RESET
        </button>

        <button class="btn"
                onclick="toggleAutoClock()">
          ${counterState.autoTimer ? "STOP CLOCK" : "AUTO CLOCK"}
        </button>
      </div>
    </div>

    <div class="counter-display">
      ${bits.map((bit, i) => `
        <div class="led ${bit ? "on" : ""}">
          <div class="lamp"></div>
          <strong>Q${3 - i}</strong>
          <span>${bit}</span>
        </div>
      `).join("")}
    </div>

    <div class="result-box">
      <b>Current State:</b> ${binary4(current)}
      <br>
      <b>Next State:</b> ${binary4(next)}
    </div>

    <p>
      Sequence progress:
      ${position >= 0 ? position + 1 : 0}
      / ${COUNTER_SEQUENCE.length}
    </p>

    <div class="progress">
      <div style="width:${progress}%"></div>
    </div>

    <div class="sequence">
      ${COUNTER_SEQUENCE.map((s, i) => `
        <span class="sequence-item ${s === current ? "active" : ""}">
          ${binary4(s)}
        </span>
        ${i < COUNTER_SEQUENCE.length - 1 ? "→" : ""}
      `).join("")}
    </div>
  </div>`;
}

function clockPulse() {
  counterState.current = counterNext(counterState.current);
  render();
}

function resetCounter() {
  counterState.current = COUNTER_SEQUENCE[0];
  render();
}

function toggleAutoClock() {
  if (counterState.autoTimer) {
    clearInterval(counterState.autoTimer);
    counterState.autoTimer = null;
  } else {
    counterState.autoTimer = setInterval(() => {
      counterState.current = counterNext(counterState.current);
      render();
    }, 1000);
  }

  render();
}

function counterKMaps() {
  const list = [];

  for (let bit = 3; bit >= 0; bit--) {
    for (const type of ["J", "K"]) {
      const data = counterFunctionData(bit, type);

      list.push({
        id: `counter-${type}${bit}`,
        title: `${type}${bit}`,
        ones: data.ones,
        dcs: data.dcs
      });
    }
  }

  return list.map(item =>
    renderKMap(
      item.id,
      `${item.title} K-Map`,
      ["Q3", "Q2", "Q1", "Q0"],
      4,
      item.ones,
      item.dcs
    )
  ).join("");
}

function counterExpressions() {
  const result = [];

  for (let bit = 3; bit >= 0; bit--) {
    for (const type of ["J", "K"]) {
      const data = counterFunctionData(bit, type);
      result.push({
        name: `${type}${bit}`,
        expression: simplifyBoolean(data.ones, data.dcs)
      });
    }
  }

  return result;
}

function renderCounter() {
  const expressions = counterExpressions();

  return `
  <div class="hero">
    <span class="badge">SECTION 2</span>
    <h2>4-Bit Random Sequence Counter</h2>
    <p>
      A functional 4-bit sequential counter using JK flip-flops.
      The complete state sequence is used consistently throughout
      the state table, excitation table, K-maps and simulator.
    </p>
  </div>

  <div class="section">
    <h2>1. Counter Definition</h2>

    <p>
      A counter is a sequential circuit that progresses through
      a predefined sequence of states in response to clock pulses.
    </p>

    <p>
      A sequential circuit is a digital circuit whose output depends
      on present inputs and stored previous state.
    </p>

    <p>
      A random sequence counter does not necessarily follow normal
      binary counting order. Instead, it follows a designed sequence
      of binary states.
    </p>

    <div class="info-grid">
      <div class="info-box">
        <b>Normal binary counter:</b>
        0000 → 0001 → 0010 → 0011 → ...
      </div>

      <div class="info-box">
        <b>Random sequence counter:</b>
        follows a selected non-binary-order sequence.
      </div>
    </div>
  </div>

  <div class="section">
    <h2>2. Clock Pulse Explanation</h2>

    <p>
      A clock pulse provides the timing event at which the sequential
      circuit changes from its present state to its next state.
    </p>

    ${renderCounterSimulator()}
  </div>

  <div class="section">
    <h2>3. 4-Bit Counter Output</h2>

    <p>
      The four state bits are Q3, Q2, Q1 and Q0.
    </p>

    <div class="counter-display">
      ${bits4(counterState.current).map((bit, i) => `
        <div class="led ${bit ? "on" : ""}">
          <div class="lamp"></div>
          <strong>Q${3-i}</strong>
          <span>${bit}</span>
        </div>
      `).join("")}
    </div>
  </div>

  <div class="section">
    <h2>4. Random Sequence State Table</h2>

    <p>
      The selected sequence is:
    </p>

    <div class="sequence">
      ${COUNTER_SEQUENCE.map((s, i) => `
        <span class="sequence-item">${binary4(s)}</span>
        ${i < COUNTER_SEQUENCE.length - 1 ? "→" : "→"}
      `).join("")}
    </div>

    ${renderCounterStateTable()}
  </div>

  <div class="section">
    <h2>5. Binary Assignment Table</h2>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sequence Position</th>
            <th>Decimal</th>
            <th>Binary State</th>
            <th>Next State</th>
          </tr>
        </thead>
        <tbody>
          ${COUNTER_SEQUENCE.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${s}</td>
              <td>${binary4(s)}</td>
              <td>${binary4(counterNext(s))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>6. Interactive State Table</h2>

    <div class="center">
      <div class="state-flow">
        <div>
          <span class="small">Present State</span>
          <div class="state-node">${binary4(counterState.current)}</div>
        </div>

        <div class="arrow">→</div>

        <div>
          <span class="small">Next State</span>
          <div class="state-node">${binary4(counterNext(counterState.current))}</div>
        </div>
      </div>

      <button class="btn btn-primary"
              onclick="clockPulse()">
        CLOCK PULSE
      </button>
    </div>
  </div>

  <div class="section">
    <h2>7. JK Excitation Table for All Four Flip-Flops</h2>

    <p>
      For each state transition, the JK inputs are obtained from:
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Q(t)</th>
            <th>Q(t+1)</th>
            <th>J</th>
            <th>K</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0</td><td>0</td><td>0</td><td>X</td></tr>
          <tr><td>0</td><td>1</td><td>1</td><td>X</td></tr>
          <tr><td>1</td><td>0</td><td>X</td><td>1</td></tr>
          <tr><td>1</td><td>1</td><td>X</td><td>0</td></tr>
        </tbody>
      </table>
    </div>

    ${renderCounterExcitationTable()}
  </div>

  <div class="section">
    <h2>8. Eight K-Maps</h2>

    <p>
      Each K-map is automatically generated from the same state
      transitions and JK excitation requirements.
    </p>

    ${counterKMaps()}
  </div>

  <div class="section">
    <h2>11. Final Counter Logic</h2>

    ${expressions.map(x => `
      <div class="expression" style="margin:10px 0">
        ${x.name} = ${x.expression}
      </div>
    `).join("")}

    <p class="small">
      Variables are Q3, Q2, Q1 and Q0. Complemented variables use
      apostrophe notation only.
    </p>
  </div>

  ${renderCounterSimulator()}
  `;
}


/* =========================================================
   QUIZ
   ========================================================= */

function buildQuestions() {
  return [
    {
      type: "mcq",
      q: "For J=0 and K=1, what does a JK flip-flop do?",
      options: ["Set", "Reset", "Toggle", "Hold"],
      answer: "Reset",
      explanation: "J=0 and K=1 is the RESET condition."
    },

    {
      type: "mcq",
      q: "For J=1 and K=0, what is Q(t+1)?",
      options: ["0", "1", "Q(t)", "Q(t)'"],
      answer: "1",
      explanation: "J=1 and K=0 sets the JK flip-flop."
    },

    {
      type: "tf",
      q: "When J=K=1, a JK flip-flop toggles its state.",
      options: ["True", "False"],
      answer: "True",
      explanation: "The 11 condition is the toggle condition."
    },

    {
      type: "mcq",
      q: "What does X represent in a JK excitation table?",
      options: ["Invalid", "Don't Care", "Clock", "Toggle"],
      answer: "Don't Care",
      explanation: "X means either 0 or 1 can be used."
    },

    {
      type: "mcq",
      q: "Which group sizes are valid in a K-map?",
      options: ["3, 5, 7", "1, 2, 4, 8, 16", "2, 3, 6", "Any size"],
      answer: "1, 2, 4, 8, 16",
      explanation: "K-map groups contain powers of two."
    },

    {
      type: "mcq",
      q: "Which adjacency is NOT allowed for a normal K-map group?",
      options: ["Horizontal", "Vertical", "Wrap-around", "Diagonal-only"],
      answer: "Diagonal-only",
      explanation: "Diagonal-only cells are not adjacent in a K-map."
    },

    {
      type: "mcq",
      q: "What is the first state of the selected random sequence counter?",
      options: ["0000", "0011", "0101", "1111"],
      answer: "0000",
      explanation: "The selected sequence starts with decimal 0 = 0000."
    },

    {
      type: "mcq",
      q: "What is the next state after 0011 in this counter?",
      options: ["0000", "0101", "0110", "1001"],
      answer: "0101",
      explanation: "The sequence is 0000 → 0011 → 0101 → 0110 ..."
    },

    {
      type: "mcq",
      q: "What happens when the CLOCK PULSE button is pressed?",
      options: [
        "The state is erased",
        "The counter moves to the next state",
        "All bits become 1",
        "The counter stops"
      ],
      answer: "The counter moves to the next state",
      explanation: "The clock event advances the sequential circuit."
    },

    {
      type: "mcq",
      q: "How many JK excitation functions are required for a 4-bit JK counter?",
      options: ["2", "4", "8", "16"],
      answer: "8",
      explanation: "Each of four flip-flops needs J and K, giving 4 × 2 = 8."
    },

    {
      type: "mcq",
      q: "Which variables are used for the 4-variable counter K-maps?",
      options: [
        "J and K",
        "Q3, Q2, Q1, Q0",
        "CLK only",
        "Q(t) and Q(t+1)"
      ],
      answer: "Q3, Q2, Q1, Q0",
      explanation: "The counter functions depend on the four present-state variables."
    },

    {
      type: "tf",
      q: "A Don't Care cell may be included in a K-map group if it helps simplify the expression.",
      options: ["True", "False"],
      answer: "True",
      explanation: "Don't Care cells may be used when they produce a valid simplification."
    },

    {
      type: "mcq",
      q: "What is the complement notation used in this platform?",
      options: ["A bar", "A̅", "A'", "A~"],
      answer: "A'",
      explanation: "The platform consistently uses apostrophe notation."
    },

    {
      type: "mcq",
      q: "What is the next state for J=1, K=1 and Q(t)=0?",
      options: ["0", "1", "X", "Invalid"],
      answer: "1",
      explanation: "J=K=1 toggles the present state, so 0 becomes 1."
    },

    {
      type: "mcq",
      q: "What is the next state for J=1, K=1 and Q(t)=1?",
      options: ["0", "1", "X", "Invalid"],
      answer: "0",
      explanation: "Toggle changes 1 to 0."
    }
  ];
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] =
      [copy[j], copy[i]];
  }

  return copy;
}

function startQuiz() {
  quizState = {
    questions: shuffle(buildQuestions()).slice(0, 10),
    index: 0,
    score: 0,
    answered: false,
    selected: null
  };

  page = "quiz";
  render();
}

function selectQuizAnswer(index) {
  if (quizState.answered) return;

  const q = quizState.questions[quizState.index];

  if (!q || index < 0 || index >= q.options.length) return;

  quizState.selected = q.options[index];

  const buttons = document.querySelectorAll(".quiz-option");

  buttons.forEach((button, i) => {
    button.classList.toggle("selected", i === index);
  });
}

function submitQuiz() {
  if (quizState.answered) return;

  if (
    quizState.selected === null ||
    quizState.selected === undefined
  ) {
    alert("Please select an answer first.");
    return;
  }

  const q = quizState.questions[quizState.index];

  if (!q) return;

  quizState.answered = true;

  if (quizState.selected === q.answer) {
    quizState.score++;
  }

  render();
}

function nextQuestion() {
  if (quizState.index >= quizState.questions.length - 1) {
    render();
    return;
  }

  quizState.index++;
  quizState.answered = false;
  quizState.selected = null;

  render();
}

function renderQuiz() {
  if (!quizState.questions.length) {
    startQuiz();
    return "";
  }

  if (quizState.index >= quizState.questions.length) {
    return renderQuizResult();
  }

  const q = quizState.questions[quizState.index];

  const progress =
    ((quizState.index + 1) / quizState.questions.length) * 100;

  return `
  <div class="hero">
    <span class="badge">SECTION 3</span>
    <h2>Question & Answer</h2>
    <p>
      Test your understanding of the concepts taught in this platform.
    </p>
  </div>

  <div class="section quiz-card">

    <div class="row" style="justify-content:space-between">
      <b>Question ${quizState.index + 1}
         / ${quizState.questions.length}</b>
      <b>Score: ${quizState.score}</b>
    </div>

    <div class="progress">
      <div style="width:${progress}%"></div>
    </div>

    <h2>${q.q}</h2>

    <div class="quiz-options">
  ${q.options.map((option, index) => `
    <button
      type="button"
      class="option quiz-option ${
        quizState.selected === option ? "selected" : ""
      }"
      onclick="selectQuizAnswer(${index})"
    >
      ${option}
    </button>
  `).join("")}
</div>

    <div class="spacer"></div>

    ${
      !quizState.answered
        ? `
          <button class="btn btn-primary"
                  onclick="submitQuiz()">
            SUBMIT ANSWER
          </button>
        `
        : `
          <div class="feedback ${
            quizState.selected === q.answer
              ? "correct"
              : "incorrect"
          }">

            <b>
              ${
                quizState.selected === q.answer
                  ? "Correct!"
                  : "Incorrect."
              }
            </b>

            <br>

            Correct answer:
            <strong>${q.answer}</strong>

            <br><br>

            ${q.explanation}
          </div>

          <br>

          ${
            quizState.index < quizState.questions.length - 1
              ? `
                <button class="btn btn-primary"
                        onclick="nextQuestion()">
                  NEXT QUESTION
                </button>
              `
              : `
                <button class="btn btn-success"
                        onclick="finishQuiz()">
                  VIEW FINAL SCORE
                </button>
              `
          }
        `
    }

  </div>`;
}

function finishQuiz() {
  quizState.index = quizState.questions.length;
  render();
}

function renderQuizResult() {
  const total = quizState.questions.length;
  const incorrect = total - quizState.score;
  const percentage = Math.round(
    (quizState.score / total) * 100
  );

  return `
  <div class="section quiz-card center">

    <span class="badge">QUIZ COMPLETE</span>

    <h2>Final Score</h2>

    <div class="result-box">
      <h3>${quizState.score} / ${total}</h3>
      <p>Total Questions: ${total}</p>
      <p>Correct Answers: ${quizState.score}</p>
      <p>Incorrect Answers: ${incorrect}</p>
      <p>Percentage: ${percentage}%</p>
    </div>

    <br>

    <button class="btn btn-primary"
            onclick="startQuiz()">
      RESTART QUIZ
    </button>

    <button class="btn"
            onclick="showPage('home')">
      HOME
    </button>

  </div>`;
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function render() {
  const app = document.getElementById("app");

  if (page === "home") {
    app.innerHTML = renderHome();
  }

  else if (page === "jk") {
    app.innerHTML = renderJK();
  }

  else if (page === "counter") {
    app.innerHTML = renderCounter();
  }

  else if (page === "quiz") {
    app.innerHTML = renderQuiz();
  }
}


/* =========================================================
   START APPLICATION
   ========================================================= */

render();