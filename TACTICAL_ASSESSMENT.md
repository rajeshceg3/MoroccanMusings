# Tactical Assessment & Strategic Roadmap: Project MARQ

## 1. Mission Overview
**Objective:** Elevate current codebase to a mission-critical, production-ready status.
**Current Status:** Functional Prototype with foundational security and modular architecture.
**Risk Level:** Moderate (Accessibility violations, conflicting directives, potential race conditions).

## 2. Threat Assessment (Gap Analysis)

### A. Security & Compliance (Priority: ALPHA)
1.  **Directive Contradiction:** `AGENTS.md` strictly forbids external dependencies, yet `index.html` CSP allows Google Fonts, Unsplash, and Pixabay. `sw.js` attempts to cache them.
    *   *Risk:* Supply chain attack vector; violation of "air-gap" simulation protocols.
    *   *Remediation:* Enforce total isolation. Download fonts/assets locally. Tighten CSP to `default-src 'self'`.
2.  **Command Injection:** `TerminalSystem` uses `textContent` (good) but lacks strict input validation limits on length, leading to potential DoS via memory exhaustion.
3.  **Cryptographic Integrity:** `CryptoGuard` uses `PBKDF2` with 100k iterations.
    *   *Recommendation:* Increase to 600k iterations (OWASP standard for 2024) or migrate to Argon2 if WebAssembly is permissible.

### B. User Experience & Accessibility (Priority: BRAVO)
1.  **Accessibility Violation:** `user-scalable=no` in `index.html` violates WCAG 1.4.4.
    *   *Impact:* Critical failure for users with visual impairments.
2.  **Mobile Responsiveness:** Touch targets for `tapestry-btn` and `alchemy-slot` may be too small (<44px) on mobile devices.
3.  **Interaction Feedback:** Canvas interactions (`MandalaRenderer`) lack haptic feedback or auditory cues for screen readers beyond basic ARIA labels.

### C. Architecture & Performance (Priority: CHARLIE)
1.  **Service Worker Cache:** `sw.js` references `marq-v2` but file list might be stale (`codex.worker.js` missing from `ASSETS`).
    *   *Risk:* Offline functionality failure.
2.  **Main Thread Blocking:** Large imports in `TapestryLedger` run on the main thread.
    *   *Remediation:* Offload JSON parsing and validation to a Worker.

## 3. Strategic Roadmap (Execution Plan)

### Phase 1: Perimeter Hardening (Security & Standards)
- [ ] **Step 1.1:** Resolve `AGENTS.md` vs `index.html` conflict.
    -   *Action:* Download Google Fonts (Inter/Amiri) locally.
    -   *Action:* Remove external CDN links from CSP.
- [ ] **Step 1.2:** Enhance `CryptoGuard`.
    -   *Action:* Bump PBKDF2 iterations to 600,000.
- [ ] **Step 1.3:** Accessibility Compliance.
    -   *Action:* Remove `user-scalable=no`.
    -   *Action:* Ensure all interactive elements have `min-width: 44px`.

### Phase 2: Tactical Maneuverability (UX & Interaction)
- [ ] **Step 2.1:** Tapestry Interaction Polish.
    -   *Action:* Implement "Smooth Zoom" for the Mandala.
    -   *Action:* Add keyboard navigation support (Arrow keys) to traverse Thread Nodes on the Canvas.
- [ ] **Step 2.2:** Feedback Systems.
    -   *Action:* Integrate `AudioEngine` cues for successful/failed actions (e.g., fusing threads).
    -   *Action:* Add "Undo" capability for critical actions (e.g., Unravel).

### Phase 3: Logistics & Reliability (DevOps & Code Quality)
- [ ] **Step 3.1:** Service Worker Synchronization.
    -   *Action:* Update `sw.js` asset list to include `codex.worker.js` and local font files.
- [ ] **Step 3.2:** Automated Verification.
    -   *Action:* Add a pre-commit hook (or script) to verify `sw.js` version matches `app.js` version.

## 4. Immediate Action Items
1.  **Modify `index.html`:** Remove `user-scalable=no`.
2.  **Modify `AGENTS.md`:** Clarify external asset policy (Stick to "No External" -> Localize assets).
3.  **Update `sw.js`:** Add missing workers to cache list.

*End of Report.*
