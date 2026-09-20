# Random Sequence Counter Simulator

**Live Website:** https://kiruthigapandiyarajan.github.io/sequence-generator/

**Student Learning Platform:** https://kiruthigapandiyarajan.github.io/random_sequence_counter/

---

## Description

The Random Sequence Counter Simulator is an interactive web-based tool built for the EC2201 (Synchronous Sequential Circuits) course project. It demonstrates how a synchronous state machine moves through a user-defined, non-standard binary sequence on each clock pulse, instead of a normal 0-1-2-3 counting order. The simulator validates every state transition, lets the user step through the sequence manually using a clock pulse control, and flags any unused or invalid 4-bit states through a live transition table.

## Input

- A user-defined sequence of 4-bit binary states, entered as comma-separated values
  - Example: `0000,0011,0101,1001,1100`
- Rules:
  - Each state must be exactly 4 bits (0000 to 1111)
  - Minimum 2 states required
  - No duplicate states allowed in the sequence
- Alternative: a "Random" button auto-generates a valid random sequence (4-6 unique states)

## Output

- Current state (binary and decimal)
- Next state preview
- Live binary output readout
- Pulse count (number of clock pulses triggered)
- Full 16-row transition table showing every possible 4-bit state, its next state, and whether it is Valid (part of the sequence) or Invalid/Unused
- Visual state ring highlighting the active/current state

## Method Used

- **Core concept:** Synchronous sequential state machine (digital logic)
- **State register:** Holds the current 4-bit state
- **Next-state logic:** Built from the user's input sequence (state[i] → state[i+1], with the last state wrapping to the first)
- **Clock pulse handling:** State only changes on a manual button click (not a free-running timer), simulating a clock edge
- **Invalid-state detection:** All 16 possible 4-bit combinations are checked against the user's sequence; any value not included is marked Invalid/Unused
- **Validation layer:** Input is checked for correct bit-length, binary-only characters, minimum length, and duplicate states before being loaded

## Software / Tools Used

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Analysis & Testing layer:** Python, Pandas, Matplotlib (Jupyter Notebook) — used to replicate the state machine logic, run automated test cases, and generate result charts
- **Hosting:** GitHub Pages

## Testing and Results

15 automated test cases were run using the Python notebook (`random_sequence_counter.ipynb`):

- **10 Normal test cases** — covering sequence loading, state transitions, wrap-around behavior, reset, pulse counting, and transition table correctness
- **5 Edge/Fault test cases** — covering non-binary input, sequences that are too short, duplicate states, wrong bit-length, and empty input

All test results (PASS/FAIL) are recorded in `test_results.csv`. Supporting visualizations:
- `state_distribution.png` — bar chart of valid vs. invalid/unused states
- `pulse_transitions.png` — line graph of state values across clock pulses

## Working Flow

1. User enters a custom 4-bit sequence (or clicks Random to auto-generate one)
2. Clicking **Load Sequence** validates the input and initializes the state machine
3. The state ring highlights all states that are part of the sequence; the current state is marked active
4. Clicking **Clock Pulse** advances the state machine by one step (current state → next state in sequence)
5. The live binary output, current/next state, and pulse count update in real time on each pulse
6. Clicking **Reset** returns the state machine to the first state and resets the pulse count
7. The transition table (all 16 states) continuously reflects which states are valid (in-sequence) and which are unused

## Setup Steps

**To run the web app locally:**
1. Download/clone the project folder containing `index.html`, `style.css`, `script.js`
2. Open `index.html` in any web browser
3. No installation or server required — it runs entirely client-side

**To run the Python analysis notebook:**
1. Open `random_sequence_counter.ipynb` in Jupyter Notebook or Google Colab
2. Install dependencies if needed: `pip install pandas matplotlib`
3. Run all cells
4. Outputs generated: `test_results.csv`, `state_distribution.png`, `pulse_transitions.png`

## File Structure
random-sequence-counter-simulator/
├── index.html
├── style.css
├── script.js
├── random_sequence_counter.ipynb
├── test_results.csv
├── state_distribution.png
├── pulse_transitions.png
