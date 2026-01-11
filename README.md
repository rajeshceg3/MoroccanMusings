# MoroccanMusings (Marq)

**Current Status:** Production Candidate
**Strategic Feature Pack:** OVERWATCH (v2.0)

Marq is an immersive, interactive narrative experience exploring Moroccan themes through generative art, procedural audio, and geospatial intelligence.

## New Feature: Project OVERWATCH (Geospatial Intelligence)

The application now includes a tactical "Map Overwatch" mode.
- **Access:** In the Tapestry screen, click "Map Overwatch" or use the CLI command `overwatch`.
- **Function:** Visualizes the user's threaded journey on a vector map of Morocco.
- **Tactical Data:** Plots nodes based on intention/region coordinates, allowing for geographic pattern analysis.

## Deployment

This application is a static site (HTML/CSS/JS). No build step is required.

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (optional, for local testing)

### Running Locally
1. Clone the repository.
2. Open `index.html` directly in your browser.
   OR
   Run a local server:
   ```bash
   python3 -m http.server 8080
   ```
   Then navigate to `http://localhost:8080`.

## Testing

Integration tests are provided using Playwright.

1. Install dependencies (if not already present):
   ```bash
   pip install playwright
   playwright install chromium
   ```

2. Run the verification script:
   ```bash
   python3 tests/verify_app.py
   python3 tests/verify_map.py
   ```

## Architecture

- **Core:** `js/app.js` (Orchestration)
- **Data:** `js/data.js` (Narrative content)
- **Visuals:** `js/tapestry.js` (Canvas rendering & Crypto Ledger)
- **Cartography:** `js/cartographer.js` (Map Rendering)
- **Audio:** `js/audio-engine.js` (Web Audio API)
- **Synthesis:** `js/alchemy.js` (Procedural generation)

## Security

- Strict Content Security Policy (CSP) is enforced.
- Input validation on data import/export.
- Subresource integrity checks (implemented via Ledger).

## License

MIT
