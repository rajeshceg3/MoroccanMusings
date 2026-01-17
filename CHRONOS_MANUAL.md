# Project CHRONOS: Tactical Narrative Forecasting

**Version:** 1.0.0
**Status:** OPERATIONAL
**Clearance:** LEVEL 3

## Overview

Project CHRONOS is a strategic predictive engine integrated into the Marq ecosystem. It allows operatives (users) to simulate the potential impact of a thread before committing it to the Tapestry. By leveraging the existing Sentinel (Threat Analysis) and Horizon (Strategic Balance) engines, CHRONOS provides a "Tactical Forecast" of the future state.

## Core Capabilities

1.  **Predictive Simulation**: Creates a high-fidelity clone of the current narrative state and injects a hypothetical thread to model system reaction.
2.  **Threat Vector Analysis**: Forecasts changes in DEFCON levels, alerting the user if a proposed action will escalate system threat levels.
3.  **Balance Projection**: Calculates the shift in narrative equilibrium (Balance Score) and Dominance vectors.
4.  **Advisory System**: Generates tactical recommendations based on the delta between the baseline and projected states.

## Architecture

### `ChronosEngine` (`js/chronos.js`)

The core logic module. It is designed to be stateless regarding the application's live data, operating solely on cloned datasets to ensure integrity.

*   **Dependencies**: `HorizonEngine` (singleton), `SentinelEngine` (class constructor).
*   **Method**: `simulate(currentThreads, proposedThread)`
    *   Deep copies the thread ledger.
    *   Instantiates ephemeral `SentinelEngine` instances for baseline and projection.
    *   Computes deltas for DEFCON, Balance, and Dominance.
    *   Returns a structured `SimulationReport`.

### UI Integration (`js/ui-system.js`)

*   **Tactical Forecast Modal**: A specialized HUD overlay displaying the simulation results.
*   **Visual Indicators**: Color-coded deltas (Green for improvement/stability, Red for escalation/imbalance).

## Usage

### GUI (Riad Screen)

1.  Navigate to a Riad (Location).
2.  Locate the **SIMULATE** button (Cyan) adjacent to the **WEAVE** button.
3.  Click to initiate the simulation.
4.  Review the **Tactical Forecast**.
    *   **EXECUTE**: Commits the thread (Weaves it).
    *   **ABORT**: Cancels the action, returning to the Riad.

### Terminal (Neural Link)

Execute the `simulate` command with the target parameters:

```bash
simulate <intention> <region> <time>
```

**Example:**
```bash
simulate serenity coast dawn
```

## Strategic Value

CHRONOS transforms the user experience from reactive to proactive. It encourages strategic planning, allowing users to optimize their "Aegis" rank and maintain system stability (DEFCON 5) by previewing the consequences of their narrative choices.
