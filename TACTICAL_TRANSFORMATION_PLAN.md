# TACTICAL TRANSFORMATION PLAN

**CLASSIFICATION:** SECRET // NOFORN
**DATE:** 2026-01-24
**OFFICER:** LT. CMDR. JULES
**SUBJECT:** COMPREHENSIVE REPOSITORY TRANSFORMATION ROADMAP

## 1. SITUATION REPORT (SITREP)

**Current Status:** MISSION AMBER (CAUTION)
**Operational Readiness:** 65%

The repository contains a functional prototype of the "MoroccanMusings" (MARQ) system. While core engines (`Stratagem`, `Valkyrie`, `Legion`) are operational, critical deficiencies in User Experience (UX), Security, and Infrastructure prevent deployment to hostile (production) environments.

## 2. GAP ANALYSIS

### 2.1 User Experience (UX) - CRITICAL
*   **Contrast Violations:** Widespread use of `#666` (Grey) on `#000` (Black) results in a contrast ratio of ~2.3:1, failing WCAG AA standards. This compromises readability in high-stress scenarios.
*   **Touch Target Precision:** The `MandalaRenderer` utilizes a touch tolerance of ~30px (`0.75` unit radius). This falls below the 44px minimum for reliable mobile interaction, leading to operator error.

### 2.2 Security & Resilience - HIGH
*   **DOM Injection:** `UISystem.renderUplinkControls` utilizes `innerHTML` to inject static HTML. While currently not processing user input, this pattern violates the "Fortress" security doctrine (No InnerHTML).
*   **Service Worker Fragility:** `public/sw.js` performs a synchronous `importScripts` at the top level. Network failure or missing manifest files will cause the Service Worker installation to crash, severing offline capabilities.

### 2.3 Infrastructure - MEDIUM
*   **CI/CD Absence:** No automated pipeline exists to verify builds or linting on commit.
*   **Linting enforcement:** Linting is manual (`npm run lint`).

## 3. TACTICAL ROADMAP

### PHASE 1: IMMEDIATE TACTICAL FIXES (EXECUTION IMMINENT)
**Objective:** Neutralize immediate threats to UX and Security.
**Timeline:** T-0 to T+1 Hour

1.  **Operation Visual Superiority:**
    *   **Action:** Replace all `#666` color codes with `#ccc` (Light Grey) to achieve WCAG AAA compliance (>7:1).
    *   **Action:** Expand `MandalaRenderer` touch tolerance to `1.1` (~44px).

2.  **Operation Iron Dome:**
    *   **Action:** Refactor `UISystem` to eliminate `innerHTML` usage.
    *   **Action:** Fortify `sw.js` with `try-catch` blocks and fallback assets.

### PHASE 2: FORTIFICATION (CI/CD)
**Objective:** Automate quality assurance.
**Timeline:** T+24 Hours

1.  **Automated Sentry:** Implement GitHub Actions for:
    *   Linting (ESLint)
    *   Unit Tests (Node)
    *   E2E Verification (Playwright)

### PHASE 3: STRATEGIC EXPANSION
**Objective:** Long-term maintainability.
**Timeline:** T+1 Week

1.  **Codebase Refactoring:**
    *   Extract hardcoded strings to `constants.js`.
    *   Implement strict TypeScript-style type checking via JSDoc.

## 4. EXECUTION ORDER

Authorization is granted to proceed immediately with **PHASE 1**.

**SIGNED:**
*LT. CMDR. JULES*
