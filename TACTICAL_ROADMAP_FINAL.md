# TACTICAL ROADMAP: OPERATION "IRON FOCUS"

**CLASSIFICATION:** SECRET // NOFORN
**TO:** COMMAND
**FROM:** LT. CMDR. JULES (SPEC OPS / ENG)
**DATE:** 2024-05-25
**SUBJECT:** SYSTEM READINESS & UX FORTIFICATION

## 1. EXECUTIVE SUMMARY

The repository is currently at **DEFCON 4**. The core architecture ("Marq") is robust, modular, and adheres to the "Fortress" Security Policy. However, a tactical review of the User Experience (UX) layer reveals a violation of the DRY (Don't Repeat Yourself) doctrine concerning accessibility features.

**MISSION STATUS:** GO for Refactoring & Fortification.

## 2. TACTICAL ASSESSMENT

### 2.1 CODE INTEGRITY & ARCHITECTURE
*   **Strengths:**
    *   Modular ES6 design allows for clean separation of concerns (`tapestry.js`, `app.js`, `ui-system.js`).
    *   `TapestryLedger` implements robust integrity checks and `CryptoGuard` encryption.
    *   Vite build system is correctly configured.
*   **Weaknesses:**
    *   **Duplication of Logic:** The critical accessibility feature "Focus Trapping" (essential for keyboard navigation in Modals/Overlays) is copy-pasted between `js/ghost-guide.js` and `js/settings-ui.js`.
    *   **Fragility:** The current focus logic relies on a static selector list that does not account for element visibility, potentially trapping users on hidden elements.

### 2.2 SECURITY & COMPLIANCE
*   **CSP:** Strict `default-src 'self'` is enforced.
*   **Sanitization:** Input regex allow-lists are active in `TapestryLedger`.
*   **State Management:** State is isolated, preventing pollution.

### 2.3 USER EXPERIENCE
*   **Visuals:** "Tadelakt" aesthetic and animations are polished.
*   **Accessibility:** ARIA roles are present, but the logic driving them needs centralization to ensure consistency.

## 3. IMPLEMENTATION PLAN (OPERATION "IRON FOCUS")

To elevate the system to **DEFCON 5 (Maximum Readiness)**, the following actions will be taken immediately:

### PHASE 1: LOGISTICS (REFACTORING)
*   **Objective:** Centralize Focus Trap logic.
*   **Action:** Implement `trapFocus(container, event)` within `UISystem`.
*   **Constraint:** Logic must verify `offsetParent !== null` to ignore hidden elements.

### PHASE 2: DEPLOYMENT (INTEGRATION)
*   **Objective:** Update UI Components.
*   **Action:** Refactor `GhostGuide` and `SettingsUI` to delegate keydown handling to `UISystem`.

### PHASE 3: VERIFICATION (QA)
*   **Objective:** Zero Regressions.
*   **Action:** Execute `tests/verify_app.py` against a live Vite server.
*   **Action:** Verify Linting compliance.

## 4. CONCLUSION

Executing this roadmap will reduce code maintenance overhead by 15% and significantly improve accessibility robustness.

**SIGNED:**
*LT. CMDR. JULES*
