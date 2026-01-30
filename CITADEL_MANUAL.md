# PROJECT CITADEL: TACTICAL PERIMETER DEFENSE

**CLASSIFICATION:** SECRET // NOFORN
**SYSTEM:** MARQ TACTICAL SUITE v2.2
**COMPONENT:** CITADEL DEFENSE GRID

## 1. OVERVIEW
Project CITADEL transforms the geospatial map into an active command surface. It allows operators to define "Defense Perimeters" (Zones) that monitor Tapestry activity. Any thread woven within a Citadel Zone triggers immediate tactical alerts and integrates with the Valkyrie Response Matrix.

## 2. CORE CAPABILITIES

### 2.1 Interactive Zone Definition
*   **Rubber Band Drawing:** Operators can click and drag on the `Cartographer` interface to define circular defense zones.
*   **Visual Feedback:** Zones are rendered as cyan dashed perimeters with semi-transparent fills.
*   **Persistence:** Zone configurations are saved locally (`localStorage`) and persist across sessions.

### 2.2 Active Monitoring
*   **Interference Check:** Every woven thread is geometrically checked against active zones.
*   **Violation Alerts:** Immediate visual and auditory warnings upon zone breach.
*   **Valkyrie Integration:** Breaches set the `zone_violation` flag in the Valkyrie context, triggering automated protocols (e.g., `CITADEL_WATCH`).

## 3. USER GUIDE

### 3.1 GUI Operation
1.  Navigate to the **Tapestry** screen.
2.  Click the **Citadel Mode** button (Cyan) in the toolbar.
    *   *Notification:* "CITADEL DEFENSE GRID: ACTIVE. DRAW ZONES."
3.  **Draw:** Click and drag on the map to create a zone.
    *   *Notification:* "CITADEL: Secure Zone Established."
4.  **Deactivate:** Click **Citadel Mode** again to exit drawing mode.

### 3.2 CLI Operation
Access the Neural Link (`~` or `Ctrl+Space`) and use the `citadel` command suite:

*   `citadel status`: View grid status and zone count.
*   `citadel list`: List coordinates and radii of all active zones.
*   `citadel clear`: Purge all defense zones.
*   `citadel toggle`: Toggle the UI mode.

## 4. TECHNICAL ARCHITECTURE

*   **Engine:** `js/citadel.js` (State management, persistence, geometry).
*   **Visualization:** `js/cartographer.js` (Canvas event handling, rendering loop).
*   **Integration:** `js/app.js` (Event wiring, Valkyrie bridge).

## 5. STRATEGIC DOCTRINE
Use Citadel Zones to protect high-value memory clusters (e.g., "Coast" sector during Dawn) or to set tripwires for adversarial narratives.
