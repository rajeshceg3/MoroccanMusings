# PROJECT PROMETHEUS: TACTICAL HEATMAP PROTOCOL

## Overview
**Project PROMETHEUS** is a geospatial density intelligence engine integrated into the Marq tactical suite. It provides a real-time thermal visualization of narrative thread activity across the operational theater (Morocco).

Unlike the standard `Cartographer` vector overlay which displays discrete nodes, **PROMETHEUS** calculates a continuous density field, allowing operators to identify "hotspots" of high activity even when individual nodes are clustered or stacked.

## Technical Architecture

### Core Engine (`js/prometheus.js`)
The engine operates as a standalone module that generates an `OffscreenCanvas` (or standard Canvas) overlay.

*   **Input:** Tapestry Threads, Location Registry.
*   **Output:** Thermal Gradient Visualization.
*   **Algorithm:**
    1.  **Coordinate Mapping:** Threads are mapped to the 0-100 tactical coordinate space.
    2.  **Deterministic Jitter:** To prevent "stacking" of threads in identical regions (e.g., multiple "Coast" threads), a pseudo-random offset is calculated based on the thread's SHA-256 hash. This creates organic "clouds" of activity rather than single points.
    3.  **Density Accumulation:** Threads are rendered as radial gradients using `globalCompositeOperation = 'lighter'`. This physically sums the photon intensity of overlapping threads.
    4.  **Thermal Colorization:** The accumulated grayscale intensity is mapped to a high-contrast thermal palette (Deep Blue -> Cyan -> Green -> Yellow -> Red) via direct pixel manipulation.

### Integration (`js/cartographer.js`)
Prometheus is injected into the `MapRenderer` pipeline as a **Background Intelligence Layer**.

*   **Layer Order:**
    1.  Background (Black)
    2.  **Prometheus Layer** (Heatmap)
    3.  Vector Map (Semi-transparent Fill)
    4.  Tactical Grid
    5.  Thread Nodes & Connections

This layering ensures that the heat signature appears "under" the terrain, providing a cohesive strategic view.

## Operational Guide

### Interpreting the Heatmap
*   **Blue/Cyan (Cool):** Isolated or low-frequency narrative activity.
*   **Green/Yellow (Warm):** Emerging cluster of activity. Indicates a narrative focal point.
*   **Red (Hot):** Critical density. High-intensity narrative convergence.

### Troubleshooting
*   **No Heatmap:** Ensure `MapRenderer` is active (Overwatch Mode).
*   **Misalignment:** Prometheus shares the coordinate system of the Cartographer. If the vector map changes scale/padding, Prometheus must be updated to match.
