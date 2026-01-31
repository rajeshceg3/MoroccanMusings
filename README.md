# MoroccanMusings (Marq)

**Current Status:** Production Ready (DEFCON 5)
**Strategic Feature Pack:** GHOST PROTOCOL (v3.0)

Marq is an immersive, interactive narrative experience exploring Moroccan themes through generative art, procedural audio, and geospatial intelligence.

## New Feature: Project OVERWATCH (Geospatial Intelligence)

The application now includes a tactical "Map Overwatch" mode.

- **Access:** In the Tapestry screen, click "Map Overwatch" or use the CLI command `overwatch`.
- **Function:** Visualizes the user's threaded journey on a vector map of Morocco.
- **Tactical Data:** Plots nodes based on intention/region coordinates, allowing for geographic pattern analysis.

## Development Protocols

**Mandatory Pre-Commit Check:**
Before submitting any changes, you must execute the tactical hygiene script:
```bash
python3 tools/pre_commit.py
```
This script enforces:
- ESLint compliance.
- Unit Test success (`tests/unit_test.mjs`).
- "Zero Tolerance" policy for active `console.log` statements.

## Deployment

To generate a production-ready, minified, and deterministic artifact:

```bash
python3 tools/deploy.py
```

The artifact will be generated in the `dist/` directory.

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for tooling)
- Node.js (for testing and linting)

### Running Locally

1. Clone the repository.
2. Run a local server:
    ```bash
    python3 -m http.server 8080
    ```
    Then navigate to `http://localhost:8080`.

## Testing

Integration tests are provided using Playwright.

1. Install dependencies:
    ```bash
    pip install playwright
    playwright install chromium
    npm install
    ```

2. Run the verification script:
    ```bash
    python3 tests/verify_app.py
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
- Build process strips debug artifacts.

## License

MIT
