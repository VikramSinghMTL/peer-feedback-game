# Game-Based Peer Feedback Scripts

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.15178938.svg)](https://doi.org/10.5281/zenodo.15178938)

This repository contains three scripts developed as part of a research project on game-based learning and peer feedback in a computer science classroom. These tools were used to collect, classify, and gamify peer feedback within a custom card game designed to motivate higher-quality student peer review.

## 📜 Contents

### 1. `scraper.js` – Moodle Workshop Feedback Scraper

A browser script used to extract student feedback from the Moodle Workshop module. It visits each peer assessment submission, collects reviewer names and feedback content, and exports the data as a `.csv` file. It also includes HTML sanitization and basic formatting.

- **Inputs**: Moodle submission page
- **Outputs**: `feedback_data.csv` with reviewer names and comments
- **Usage**: Run directly in the browser console on a Moodle Workshop results page

### 2. `card-assigner.js` – Action Card Assigner

A Node.js script that reads classified feedback categories (e.g., "SA", "G+", etc.), assigns point values, and converts them into in-game resources (trade, steal, and nope cards). The script outputs a CSV with card assignments per student.

- **Inputs**: `feedback.csv` with reviewer names and feedback codes
- **Outputs**: `card_assignments.csv`
- **Usage**: `node card-assigner.js`

### 3. `simulation.js` – Card Game Simulator

A detailed simulation of the custom card game used in the intervention. It models player turns, resources, setbacks, trade/steal/nope actions, and win conditions. It was used to test and balance game timing and complexity across 1,000 simulations.

- **Inputs**: Internal game configuration (resources, rules)
- **Outputs**: Console summaries and optional JSON logs
- **Usage**: `node simulation.js`

---

## 🔍 Learn More

Details of the research project, including the design of the intervention and study findings, can be found at [https://singh.gg/research](https://singh.gg/research).

---

## 🧾 Citation

If you use or adapt these scripts, please cite the following Zenodo record:

> Singh, V. (2025). *Scripts for Game-Based Peer Feedback Intervention* (1.0.0). Zenodo. [https://doi.org/10.5281/zenodo.15178938](https://doi.org/10.5281/zenodo.15178938)

---

## 📘 License

This work is licensed under Creative Commons. See `LICENSE.txt` for details.

---

## 💬 Contact

For questions or collaboration inquiries, feel free to reach out via GitHub or email: [vikram.singh@johnabbott.qc.ca](vikram.singh@johnabbott.qc.ca)
