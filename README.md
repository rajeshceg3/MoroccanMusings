# MoroccanMusings (Marq)

**Current Status:** Production Candidate

Marq is an immersive, interactive narrative experience exploring Moroccan themes through generative art and procedural audio.

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
   ```

## Architecture

- **Core:** `js/app.js` (Orchestration)
- **Data:** `js/data.js` (Narrative content)
- **Visuals:** `js/tapestry.js` (Canvas rendering & Crypto Ledger)
- **Audio:** `js/audio-engine.js` (Web Audio API)
- **Synthesis:** `js/alchemy.js` (Procedural generation)

## Security

- Strict Content Security Policy (CSP) is enforced.
- Input validation on data import/export.
- Subresource integrity checks (implemented via Ledger).

## License

MIT
