# AGENTS.md

## Codebase Guidelines

### 1. Security & Compliance
- **Strict CSP:** Do not use inline styles (`style="..."`) or event handlers (`onclick="..."`) in HTML. All styles must be in `css/styles.css` and logic in JS modules.
- **Input Validation:** All data entering the `TapestryLedger` (import/export) must be strictly validated against the schema.
- **No External Dependencies:** Do not add `<script>` tags pointing to CDNs. All libraries must be vendored or implemented in vanilla JS.

### 2. Architecture
- **Modularity:** Keep concerns separated.
    - `tapestry.js`: Visuals & Ledger.
    - `cartographer.js`: Map & Geospatial.
    - `alchemy.js`: Logic/Synthesis.
- **State Management:** `js/app.js` is the single source of truth for UI state.

### 3. Verification
- Run `tests/verify_app.py` after any UI/Architecture change.
- Run `tests/verify_map.py` after changes to `cartographer.js` or `data.js` coordinates.

### 4. New Features (Strategic)
- Future enhancements should prioritize "Offline First" and "Resilience".
- Consider expanding `Cartographer` to support zooming or more detailed vector paths if strict file size limits allow.
