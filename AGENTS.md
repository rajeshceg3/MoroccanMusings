# AGENTS.md

## Codebase Guidelines

### 1. Security & Compliance

- **Strict CSP:** The application is now a "Fortress". `default-src 'self'` is enforced. No external scripts, styles, images, or media are permitted. All assets must be served from `assets/`.
- **Input Validation:** All data entering the `TapestryLedger` (import/export) must be strictly validated against the schema.
- **Crypto:** All cryptographic operations must occur within the `CryptoGuard` module. Keys must never be logged.

### 2. Architecture

- **Modularity:** Keep concerns separated.
    - `tapestry.js`: Visuals & Ledger.
    - `cartographer.js`: Map & Geospatial.
    - `prometheus.js`: Geospatial Heatmap Engine.
    - `alchemy.js`: Logic/Synthesis.
- **State Management:** `js/app.js` is the single source of truth for UI state.
- **Tooling:** Use `npm run lint` and `npm run format` to maintain code hygiene.

### 3. Verification

- Run `tests/verify_app.py` after any UI/Architecture change.
- Run `tests/verify_map.py` after changes to `cartographer.js` or `data.js` coordinates.
- Ensure all tests pass before deployment.

### 4. User Experience (UX)

- **Feedback:** Every async operation must utilize the `UISystem.showLoading()` overlay.
- **Accessibility:**
    - Ensure all interactive elements have `tabindex`, `role`, and `aria-label`.
    - Maintain `:focus-visible` styles for keyboard navigation.
    - Respect `prefers-reduced-motion`.
