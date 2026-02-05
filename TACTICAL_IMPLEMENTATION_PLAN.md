# TACTICAL IMPLEMENTATION PLAN: OPERATION "IRON CLAD"

**CLASSIFICATION:** SECRET // NOFORN
**TO:** ENGINEERING COMMAND
**FROM:** LT. CMDR. JULES
**DATE:** 2024-05-25
**MISSION:** RESTORE SYSTEM INTEGRITY AND OPTIMIZE UX

## 1. MISSION OVERVIEW

The objective of Operation "Iron Clad" is to eliminate the vulnerabilities identified in the Tactical Assessment and elevate the "MoroccanMusings" repository to a verifiable Production Ready state.

## 2. EXECUTION PHASES

### PHASE 1: LOGISTICS & PERIMETER (PRIORITY: CRITICAL)
**Objective:** Re-establish build integrity and automated hygiene.

*   **1.1 Restore Deployment Capability**
    *   **Action:** Create `tools/deploy.py`.
    *   **Specs:** Script must execute `vite build`, compute SHA-256 hash of `dist/`, and strip `console.log`/debug flags from artifacts.
    *   **Success Criteria:** Running `python3 tools/deploy.py` generates a clean `dist/` folder and outputs a Build Hash.

*   **1.2 Reinforce Pre-Commit Protocol**
    *   **Action:** Update `tools/pre_commit.py`.
    *   **Specs:** Add checks for `innerHTML` usage (forbidden except in sanitized zones) and verify `deploy.py` exists.
    *   **Success Criteria:** Pre-commit blocks any commit containing unsanitized DOM manipulation.

### PHASE 2: ARCHITECTURAL FORTIFICATION (PRIORITY: HIGH)
**Objective:** Deconstruct the `app.js` "God Object" to reduce cognitive load and regression risk.

*   **2.1 Extract Screen Controllers**
    *   **Action:** Create `js/controllers/SplashController.js`, `js/controllers/AstrolabeController.js`, etc.
    *   **Specs:** Move event listeners and DOM logic from `app.js` to these classes.
    *   **Success Criteria:** `app.js` is reduced to < 300 lines, serving only as the "Dispatcher".

*   **2.2 Isolate Animation Logic**
    *   **Action:** Create `js/fx/WeaveFX.js`.
    *   **Specs:** Encapsulate the "Weave" thread animation logic.
    *   **Success Criteria:** Animation logic is reusable and handles window resize events gracefully.

### PHASE 3: UX OFFENSIVE (PRIORITY: MEDIUM)
**Objective:** Polish the operator experience and ensure accessibility dominance.

*   **3.1 Ghost Guide Hardening**
    *   **Action:** Update `js/ghost-guide.js`.
    *   **Specs:** Detect current screen state before forcing transitions. Ensure focus returns to trigger element on close.
    *   **Success Criteria:** Guide can be opened/closed on *any* screen without state loss.

*   **3.2 Reduced Motion Compliance**
    *   **Action:** Update all JS animations (`WeaveFX`, `Splash`) to respect `prefers-reduced-motion`.
    *   **Success Criteria:** Animations instant-complete when system setting is active.

### PHASE 4: DRILLS & SIMULATION (PRIORITY: HIGH)
**Objective:** Verify system resilience.

*   **4.1 Enhanced Field Exercise**
    *   **Action:** Update `tests/verify_app.py`.
    *   **Specs:** Add a test case that *enables* the Ghost Guide and steps through it.
    *   **Success Criteria:** Test passes with `marq_onboarded = false`.

## 3. TIMELINE & ROE (RULES OF ENGAGEMENT)

1.  **Phase 1** must be executed immediately (Day 0).
2.  **Phase 2** requires a code freeze on new features.
3.  **Phase 3 & 4** can be executed in parallel.

**COMMANDER'S INTENT:**
We do not ship broken builds. We do not skip tests. We do not compromise on UX. Execute with extreme prejudice.

**SIGNED:**
*LT. CMDR. JULES*
