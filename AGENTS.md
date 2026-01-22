# AGENTS.md

## ⚠️ OPERATIONAL PROTOCOLS: CLASSIFIED

**COMMANDER:** NAVSPECWARCOM / CYBER WARFARE DIVISION
**MISSION:** PROJECT MARQ
**STATUS:** ACTIVE

### 1. CODEBASE INTEGRITY (ZERO TOLERANCE)

All personnel (agents) interacting with this repository must adhere to the following strict standards. Failure to comply will result in immediate rollback.

*   **"Fortress" Security Policy:**
    *   **CSP Enforcement:** `default-src 'self'` is absolute. No external CDNs, fonts, or analytics. All assets must be local.
    *   **Sanitization:** All inputs into the `TapestryLedger` must pass strict regex validation. Trust nothing.
    *   **Crypto:** Keys exist *only* in memory (`CryptoGuard`). Never log keys or persistence tokens.
    *   **DOM Safety:** Use `textContent` over `innerHTML`. If `innerHTML` is tactically necessary, it must be sanitized and justified.

*   **Code Hygiene:**
    *   **Linting:** `npm run lint` must pass with **zero warnings**.
    *   **Formatting:** `npm run format` must be applied before every commit.
    *   **Explicitness:** Global exposures (e.g., on `window`) for testing must be explicitly documented with `// DEBUG EXPOSURE`.

### 2. ARCHITECTURAL DOCTRINE

*   **Separation of Concerns:**
    *   `app.js`: Mission Control (Orchestration only).
    *   `ui-system.js`: Visual output and HUD management.
    *   `tapestry.js`: Core Ledger and Visualization logic.
    *   `terminal-commands.js`: CLI logic (Dependency Injected).
*   **State Management:**
    *   `app.js` holds the Single Source of Truth (`state` object).
    *   Engines (Alchemy, Horizon, Sentinel) are stateless processors where possible.

### 3. VERIFICATION PROTOCOLS

Before declaring "Mission Accomplished" (Submit), you must execute:
1.  **Static Analysis:** `npm run lint`
2.  **Unit Verification:** `node tests/unit_test.mjs` (New Protocol)
3.  **Integration Drills:** `python3 tests/verify_app.py`

### 4. USER EXPERIENCE (THE "HEARTS AND MINDS" DOCTRINE)

*   **Feedback is Mandatory:** Every user action must have an immediate visual or auditory response.
*   **Accessibility:** The interface must be operable by all agents. Maintain ARIA roles and keyboard focus visibility.
*   **Resilience:** The system must degrade gracefully. Handle offline states and errors with tactical notifications, not white screens.
*   **Performance:** 60 FPS on the Tapestry Canvas. Optimize render loops.

### 5. GIT DISCIPLINE

*   Commit messages must be imperative and descriptive (e.g., "Fortify input validation in Ledger").
*   Do not commit broken builds.
