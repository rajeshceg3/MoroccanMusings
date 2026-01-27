# TACTICAL TRANSFORMATION PLAN: OPERATION "GHOST PROTOCOL"

**CLASSIFICATION:** TOP SECRET // EYES ONLY
**TO:** COMMAND
**FROM:** LT. CMDR. JULES (SPEC OPS / ENG)
**DATE:** 2024-05-25
**SUBJECT:** SYSTEM TRANSFORMATION & UX DOMINANCE

## 1. SITUATION REPORT (SITREP)

A comprehensive audit of the repository reveals that the "Fortress" security policies are currently enforced. Critical vulnerabilities listed in previous intelligence reports (Panopticon XSS, Import Fog of War) were verified as **already remediated** in the current codebase.

However, the current operational state, while secure, lacks the intuitive "tactical flow" required for high-stress environments. The onboarding process ("Ghost Guide") is passive, and deployment procedures are rudimentary.

**CURRENT DEFCON:** 3 (Yellow) - Secure but functionally rigid.

## 2. STRATEGIC OBJECTIVES

### 2.1 OBJECTIVE ALPHA: UX DOMINANCE (PRIORITY 1)
*   **Mission:** Transform the "Ghost Guide" from a static text overlay into an interactive, context-aware onboarding system.
*   **Tactic:** Implement DOM highlighting for active guide steps.
*   **Target:** Reduce operator confusion by 40%.
*   **Sub-Tactic:** Implement "Tactical Tooltips" for all icon-based controls to eliminate ambiguity.
*   **Note:** Verification confirmed basic loading indicators exist, but comprehensive feedback for all async actions is required.

### 2.2 OBJECTIVE BRAVO: OPERATIONAL INTEGRITY (PRIORITY 2)
*   **Mission:** Fortify the build process (`tools/deploy.py`) to ensure deterministic reproducibility.
*   **Tactic:** Replace timestamp-based build IDs with content hashes.
*   **Target:** 100% reproducible builds.
*   **Sub-Tactic:** enhance JS/CSS minification logic (currently whitespace-only) for better payload efficiency.

### 2.3 OBJECTIVE CHARLIE: VERIFICATION PROTOCOLS (PRIORITY 3)
*   **Mission:** Expand the automated testing perimeter.
*   **Tactic:** Integrate `tests/verify_app.py` into the standard `npm test` workflow.
*   **Target:** Automated E2E coverage for critical paths (Riad Weaving, Tapestry Analysis).

## 3. TACTICAL IMPLEMENTATION ROADMAP

### PHASE 1: RECONNAISSANCE & UX HARDENING (Immediate Action)
*   [ ] **1.1 Interactive Guide Upgrade:**
    *   Modify `js/app.js` `initGhostGuide` to accept `targetSelector` for each step.
    *   Implement a "Spotlight" effect in `css/styles.css` (`.guide-spotlight`) to dim the background and highlight the target element.
*   [ ] **1.2 Iconography Intelligence:**
    *   Add `title` attributes to all critical UI buttons (Astrolabe markers, Riad actions, Tapestry tools).
    *   Implement a CSS-only tooltip system (`data-tooltip`) for cleaner, tactical aesthetics.

### PHASE 2: LOGISTICS & DEPLOYMENT (Week 1)
*   [ ] **2.1 Deterministic Build System:**
    *   Refactor `tools/deploy.py`:
        *   Replace `time.time()` with `hashlib.sha256` of file contents for `BUILD_ID`.
        *   Implement robust regex-based minification to strip console logs and comments safely.
*   [ ] **2.2 Asset Optimization:**
    *   Ensure all images in `assets/` are compressed.

### PHASE 3: WAR GAMES (Week 2)
*   [ ] **3.1 Automated Drills:**
    *   Expand `tests/verify_app.py` to:
        *   Simulate a full "Weave" cycle (Astrolabe -> Riad -> Tapestry).
        *   Verify "Panopticon" replay mode.
    *   Add `test:e2e` script to `package.json`.

## 4. SUCCESS CRITERIA

1.  **UX:** New users can complete a "Weave" operation without external documentation.
2.  **Ops:** Two consecutive builds of the same source produce identical `dist/` artifacts (bit-for-bit).
3.  **Quality:** `npm run test:e2e` passes in < 30 seconds.

**COMMANDER'S INTENT:** Execute Phase 1 immediately. Elevate the operator experience to match the sophisticated backend architecture.

**SIGNED:**
*LT. CMDR. JULES*
