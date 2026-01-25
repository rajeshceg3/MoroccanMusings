# PROJECT VANGUARD: TACTICAL DRONE PROTOCOLS

**CLASSIFICATION:** SECRET // NOFORN
**SYSTEM:** MARQ TACTICAL SUITE v2.1
**COMPONENT:** AUTONOMOUS UNIT CONTROL

## 1. OVERVIEW
Project VANGUARD introduces autonomous tactical units (Drones) to the operational theater. These units provide active reconnaissance, threat interception, and dynamic map analysis, transforming the `Cartographer` interface from a passive display into an active command center.

## 2. UNIT TYPES

### 2.1 SCOUT (Class-S)
*   **Role:** Reconnaissance & Intel Gathering
*   **Behavior:** Patrols random sectors. Performs deep scans on nearby Tapestry Threads.
*   **Stats:** High speed, Broad sensor range.
*   **Visual:** Cyan Triangle.

### 2.2 INTERCEPTOR (Class-I)
*   **Role:** Threat Response & Containment
*   **Behavior:** Automatically vectors towards High Threat Zones identified by `Sentinel`.
*   **Stats:** Maximum speed, Focused sensor range.
*   **Visual:** Gold/Amber Triangle.

## 3. TERMINAL COMMANDS

The `vanguard` command suite is available in the Neural Link Terminal (`~`).

*   `vanguard status`: Displays active fleet status, battery levels, and current orders.
*   `vanguard deploy <type> [region]`: Deploys a new unit.
    *   Example: `vanguard deploy scout sahara`
    *   Example: `vanguard deploy interceptor coast`
*   `vanguard recall <id>`: Recalls a specific unit to base (removes from map).

## 4. INTEGRATION

*   **Cartographer:** Units are rendered in real-time with FOV cones and scan pulses.
*   **Sentinel:** Interceptors subscribe to Sentinel Threat Reports to acquire targets.
*   **Aegis:** (Planned) Successful scans will award Tactical XP and unlock badges.

## 5. TACTICAL DOCTRINE

Operators are advised to maintain a minimum of **2 Scouts** active during weaving operations to ensure maximum situational awareness. **Interceptors** should be deployed immediately upon DEFCON 3 or higher alerts.
