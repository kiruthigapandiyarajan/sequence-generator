# Random Sequence Counter Simulator

An interactive 4-bit synchronous state-machine simulator built for the EC2201 (Synchronous Sequential Circuits) course project. Demonstrates user-defined sequence loading, clock-pulse-driven state transitions, and invalid-state detection through a live transition table.

## Problem Statement
Design a software solution for the real-world scenario represented by "Random Sequence Counter Simulator", using the specified digital-system concept and reproducible synthetic data.

## Software Solution
An interactive 4-bit synchronous state-machine simulator that accepts a user-defined sequence, validates each transition, simulates clock pulses on demand, and flags invalid/unused states through a live transition table.

## Features
- User-defined 4-bit binary sequence input (comma-separated)
- Random valid sequence generator
- Manual Clock Pulse control (button-triggered state transitions, not auto-timer)
- Reset control
- Live state ring visualization (16 possible 4-bit states, current state highlighted)
- Live binary output readout
- Full 16-row transition table with Valid / Invalid-Unused status
- Pulse count and sequence stats

## Tech Stack
- Frontend: HTML, CSS, JavaScript (no framework)
- Analysis/testing layer: Python, Pandas, Matplotlib (Jupyter Notebook)

## File Structure