import { TapestryLedger } from '../tapestry.js';
import { MandalaRenderer } from '../mandala.js';
import { MapRenderer } from '../cartographer.js';
import { SynapseRenderer } from '../synapse.js';
import { OracleEngine } from '../oracle.js';
import { MnemosyneUI } from '../mnemosyne-ui.js';

export class TapestryController {
    constructor(context) {
        this.context = context;
        this.mandalaRenderer = null;
        this.mapRenderer = null;
        this.synapseRenderer = null;
        this.oracleEngine = null;
        this.mnemosyneUI = null;
        this.horizonAnimationFrame = null;

        this.render = this.render.bind(this);
        this.loop = this.loop.bind(this);
    }

    init() {
        this.setupInteractions();
    }

    onShow() {
        const { state, elements, mnemosyneContainer, mnemosyne, tapestryLedger, vanguard, resonanceEngine, sentinel, ui, citadel, horizonEngine, locations } = this.context;
        // app.js initialized oracleEngine lazily.

        // Lazy Init Mnemosyne UI
        if (!this.mnemosyneUI) {
            this.mnemosyneUI = new MnemosyneUI(
                mnemosyneContainer,
                mnemosyne,
                tapestryLedger,
                (index) => this.handleThreadInteraction(index)
            );
        }

        if (!this.mandalaRenderer) {
            this.mandalaRenderer = new MandalaRenderer(elements.tapestry.canvas);
        } else {
            this.mandalaRenderer.resize();
        }

        if (!this.mapRenderer && elements.tapestry.mapCanvas) {
            this.mapRenderer = new MapRenderer(elements.tapestry.mapCanvas);

            // Wire up Map Events
            elements.tapestry.mapCanvas.addEventListener('vanguard-command', (e) => {
                const { unitId, target } = e.detail;
                const unit = vanguard.getUnits().find(u => u.id === unitId);
                if (unit) {
                    unit.command(target);
                    resonanceEngine.playInteractionSound('click');
                }
            });

            elements.tapestry.mapCanvas.addEventListener('map-thread-click', (e) => {
                this.handleThreadInteraction(e.detail.index);
            });

            elements.tapestry.mapCanvas.addEventListener('citadel-zone-created', (e) => {
                const zone = citadel.addZone(e.detail);
                ui.showNotification(`CITADEL: Secure Zone ${zone.id} Established.`, 'success');
                this.render();
            });

            elements.tapestry.mapCanvas.addEventListener('draft-selected', (e) => {
                this.context.showDraft(e.detail);
            });

            // Initialize Oracle once map renderer is available
            if (!this.oracleEngine) {
                this.oracleEngine = new OracleEngine(
                    horizonEngine,
                    this.mapRenderer,
                    locations
                );
            }
        }

        if (!this.synapseRenderer && elements.tapestry.canvas) {
            // Reuse the main canvas for Synapse, logic switches in renderTapestry
            this.synapseRenderer = new SynapseRenderer(elements.tapestry.canvas);
        }

        this.mandalaRenderer.setSelection(state.selectedThreads);

        // Initial render
        this.render();
        this.updateAlchemyUI();

        // Sentinel Scan on screen entry
        sentinel.assess(tapestryLedger.getThreads());

        // Start animation loop if horizon is active
        if (state.isHorizonActive) {
            this.startHorizonLoop();
        }
    }

    onHide() {
        this.stopHorizonLoop();
    }

    loop() {
        if (this.isRenderError) return;
        this.render();
        if (this.context.state.activeScreen === 'tapestry' && this.context.state.isHorizonActive) {
            this.horizonAnimationFrame = requestAnimationFrame(this.loop);
        } else {
            this.horizonAnimationFrame = null;
        }
    }

    startHorizonLoop() {
        if (this.horizonAnimationFrame) return;
        this.loop();
    }

    stopHorizonLoop() {
        if (this.horizonAnimationFrame) {
            cancelAnimationFrame(this.horizonAnimationFrame);
            this.horizonAnimationFrame = null;
        }
    }

    updateHorizonDashboard() {
        const { tapestryLedger, horizonEngine, elements } = this.context;
        const threads = tapestryLedger.getThreads();
        const analysis = horizonEngine.analyze(threads);

        elements.tapestry.horizonDominance.textContent =
            analysis.dominance.intention !== 'None'
                ? `${analysis.dominance.intention} (${analysis.dominance.percent}%)`
                : 'None';
        elements.tapestry.horizonBalanceBar.style.width = `${analysis.balanceScore}%`;

        // Dynamic Insight
        if (threads.length < 3) {
            elements.tapestry.horizonInsight.textContent =
                'More data needed for strategic projection.';
        } else if (analysis.balanceScore < 40) {
            elements.tapestry.horizonInsight.textContent = `Pattern is heavily skewed. Consider seeking ${this.findLeastCommon(analysis.counts)} to restore equilibrium.`;
        } else if (analysis.streak > 2) {
            elements.tapestry.horizonInsight.textContent = `Strong momentum in ${analysis.lastIntention}. Continuing this path will deepen the groove.`;
        } else {
            elements.tapestry.horizonInsight.textContent =
                'The pattern is balanced. You are weaving a diverse tapestry.';
        }
    }

    findLeastCommon(counts) {
        return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
    }

    handleThreadInteraction(index) {
        const { tapestryLedger, state, resonanceEngine } = this.context;
        const threads = tapestryLedger.getThreads();
        if (index >= 0 && index < threads.length) {
            // Toggle selection
            const selectedIndex = state.selectedThreads.indexOf(index);
            if (selectedIndex >= 0) {
                state.selectedThreads.splice(selectedIndex, 1);
            } else {
                if (state.selectedThreads.length < 2) {
                    state.selectedThreads.push(index);
                } else {
                    // FIFO replacement if full
                    state.selectedThreads.shift();
                    state.selectedThreads.push(index);
                }
            }
            if (this.mandalaRenderer) this.mandalaRenderer.setSelection(state.selectedThreads);
            this.render();
            resonanceEngine.playInteractionSound('click');
            this.updateAlchemyUI();
        }
    }

    updateAlchemyUI() {
        const { elements, tapestryLedger, state } = this.context;
        const slots = [elements.tapestry.slot1, elements.tapestry.slot2];
        const threads = tapestryLedger.getThreads();

        state.selectedThreads.forEach((threadIndex, i) => {
            slots[i].classList.add('filled');
            const t = threads[threadIndex];
            slots[i].textContent = t ? t.intention[0].toUpperCase() : '?';
        });

        // Clear empty slots
        for (let i = state.selectedThreads.length; i < 2; i++) {
            slots[i].classList.remove('filled');
            slots[i].textContent = i + 1;
        }

        if (state.selectedThreads.length === 2) {
            elements.tapestry.fuseBtn.disabled = false;
        } else {
            elements.tapestry.fuseBtn.disabled = true;
        }

        elements.tapestry.alchemyUI.classList.toggle(
            'visible',
            threads.length >= 2
        );

        if (state.selectedThreads.length === 1 && this.mnemosyneUI) {
            const threadId = tapestryLedger.getThreads()[state.selectedThreads[0]].id;
            this.mnemosyneUI.render(threadId);
        } else if (this.mnemosyneUI) {
            this.mnemosyneUI.hide();
        }
    }

    render() {
        if (this.isRenderError) return;
        try {
            const { panopticon, stratagem, tapestryLedger, vanguard, legion, state, sentinel, prometheus, citadel, horizonEngine, locations } = this.context;

            // Halt render loop if Panopticon is controlling reality
            if (panopticon && panopticon.isReplaying) return;

            // Stratagem Check
            if (stratagem.isActive) {
                const simState = stratagem.getRenderState();

                if (this.mapRenderer) {
                    this.mapRenderer.render(
                        simState.threads,
                        locations,
                        [], // drafts
                        simState.threatZones || [],
                        simState.units,
                        simState.zones // citadel zones
                    );
                }
                return;
            }

            const threads = tapestryLedger.getThreads();

            // Update Tactical Units & Swarm Intelligence
            vanguard.tick();
            legion.tick(tapestryLedger);

            // 1. Map Mode
            if (state.isMapActive) {
                if (this.oracleEngine && this.oracleEngine.activeMode) {
                    this.oracleEngine.render(threads);
                } else if (this.mapRenderer) {
                    const threatReport = sentinel.getReport();
                    this.mapRenderer.render(
                        threads,
                        locations,
                        prometheus.getDrafts(),
                        threatReport.zones,
                        vanguard.getUnits(),
                        citadel.getZones(),
                        vanguard.getSquads()
                    );
                }
                // Force animation loop if map is active
                requestAnimationFrame(this.render);
                return;
            }

            // 2. Synapse Mode
            if (state.isSynapseActive && this.synapseRenderer) {
                 this.synapseRenderer.render();
                 return;
            }

            // 3. Mandala Mode (Default)
            if (!this.mandalaRenderer) return;

            let projections = [];
            if (state.isHorizonActive) {
                projections = horizonEngine.project(threads);
            }

            this.mandalaRenderer.render(threads, projections);
        } catch (e) {
            console.error("CRITICAL RENDER FAILURE:", e);
            this.isRenderError = true;
            this.context.ui.showNotification("VISUAL SYSTEM CRITICAL ERROR. RENDERER HALTED.", "error");
        }
    }

    setupInteractions() {
        const { elements, showScreen, ui, tapestryLedger, codex, resonanceEngine, state, alchemy, cortex, mnemosyne, aegis, valkyrieUI, prometheus, locations } = this.context;
        const { showRiad } = this.context; // Destructure callback

        elements.astrolabe.tapestryIcon.addEventListener('click', () => {
            showScreen('tapestry');
        });

        elements.tapestry.backButton.addEventListener('click', () => {
            showScreen('astrolabe');
        });

        elements.tapestry.clearBtn.addEventListener('click', () => {
            ui.showConfirm(
                'Are you sure you want to unravel your tapestry? This cannot be undone.',
                () => {
                    tapestryLedger.clear();
                    if (this.mandalaRenderer) this.mandalaRenderer.render([]);
                    if (this.mapRenderer) this.mapRenderer.render([], locations);
                    ui.showNotification('Tapestry unraveled.', 'info');
                }
            );
        });

        elements.tapestry.exportBtn.addEventListener('click', () => {
            const data = tapestryLedger.exportScroll();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `marq_scroll_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        elements.tapestry.importBtn.addEventListener('click', () => {
            elements.tapestry.importInput.click();
        });

        elements.tapestry.importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                ui.showLoading('DECODING SCROLL...');
                const text = await file.text();
                await tapestryLedger.importScroll(text);
                ui.showNotification('Scroll imported successfully.', 'success');
                this.render();
            } catch (err) {
                ui.showNotification(`Import error: ${err.message}`, 'error');
            } finally {
                ui.hideLoading();
                e.target.value = ''; // Reset
            }
        });

        // --- CODEX INTEGRATION ---
        elements.tapestry.forgeShardBtn.addEventListener('click', async () => {
            try {
                const threads = tapestryLedger.getThreads();
                if (threads.length === 0)
                    throw new Error('Tapestry is empty. Nothing to forge.');

                ui.showLoading('ENCRYPTING SHARD...');
                const blob = await codex.forgeShard(threads);
                ui.hideLoading();

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `codex_shard_${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);

                ui.showNotification('Shard forged successfully.', 'success');
                resonanceEngine.playInteractionSound('weave');
            } catch (e) {
                document.body.style.cursor = 'default';
                ui.showNotification(`Forge failed: ${e.message}`, 'error');
            }
        });

        elements.tapestry.scanShardBtn.addEventListener('click', () => {
            elements.tapestry.shardInput.click();
        });

        elements.tapestry.shardInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                ui.showLoading('DECRYPTING SHARD...');
                const data = await codex.scanShard(file);
                ui.hideLoading();

                // Use existing import logic
                const tempLedger = new TapestryLedger('temp');
                tempLedger.threads = data;
                const jsonString = JSON.stringify(data);
                await tapestryLedger.importScroll(jsonString);

                ui.showNotification(
                    'Shard decrypted and integrated.',
                    'success'
                );
                resonanceEngine.playInteractionSound('snap');
                this.render();
            } catch (e) {
                document.body.style.cursor = 'default';
                console.error(e);
                ui.showNotification(`Scan failed: ${e.message}`, 'error');
            }
            e.target.value = '';
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (state.activeScreen === 'tapestry') {
                    if (this.mandalaRenderer) {
                        this.mandalaRenderer.resize();
                        this.mandalaRenderer.render(tapestryLedger.getThreads());
                    }
                    if (this.mapRenderer) {
                        this.mapRenderer.resize();
                        this.mapRenderer.render(
                            tapestryLedger.getThreads(),
                            locations
                        );
                    }
                }
            }, 100);
        });

        elements.tapestry.canvas.addEventListener('click', (e) => {
            if (!this.mandalaRenderer) return;
            // Only handle click if map is NOT active (or canvas is hidden via CSS, which we need to ensure)
            if (state.isMapActive) return;

            const index = this.mandalaRenderer.getThreadIndexAt(
                e.clientX,
                e.clientY
            );
            this.handleThreadInteraction(index);
        });

        // Listen for accessibility events from Shadow DOM
        elements.tapestry.canvas.addEventListener(
            'tapestry-thread-click',
            (e) => {
                this.handleThreadInteraction(e.detail.index);
            }
        );

        // Synapse Interaction (Mouse & Zoom)
        ['mousedown', 'mousemove', 'mouseup'].forEach(evt => {
            elements.tapestry.canvas.addEventListener(evt, (e) => {
                if (state.isSynapseActive && this.synapseRenderer) {
                    const type = evt === 'mousedown' ? 'down' : evt === 'mousemove' ? 'move' : 'up';
                    this.synapseRenderer.handleInput(type, e.clientX, e.clientY);

                    if (type === 'move' && this.synapseRenderer.isPanning) {
                        this.synapseRenderer.handlePan(e.movementX, e.movementY);
                    }

                    if (this.synapseRenderer.isSimulating || this.synapseRenderer.isPanning) {
                         this.startHorizonLoop();
                    } else if (type === 'up') {
                        // Ensure final render
                        requestAnimationFrame(this.render);
                    }
                }
            });
        });

        elements.tapestry.canvas.addEventListener('wheel', (e) => {
            if (state.isSynapseActive && this.synapseRenderer) {
                e.preventDefault();
                this.synapseRenderer.handleZoom(e.deltaY, e.clientX, e.clientY);
                requestAnimationFrame(this.render);
            }
        }, { passive: false });

        elements.tapestry.fuseBtn.addEventListener('click', async () => {
            const threads = tapestryLedger.getThreads();
            if (state.selectedThreads.length !== 2) return;

            const t1 = threads[state.selectedThreads[0]];
            const t2 = threads[state.selectedThreads[1]];

            const phantom = await alchemy.fuse(t1, t2);

            resonanceEngine.playInteractionSound('weave'); // Magical sound
            showScreen('riad');
            showRiad(phantom);

            // Inject a special visual cue for Phantom mode
            elements.riad.title.style.color = '#c67605'; // Gold title
            elements.riad.subtitle.textContent = '✧ A PHANTOM REALM ✧';

            // Clear selection
            state.selectedThreads = [];
        });

        // Horizon Interaction
        elements.tapestry.horizonToggle.addEventListener('click', () => {
            // Close Aegis HUD if open (Mobile UX)
            if (elements.tapestry.aegisHud.classList.contains('visible')) {
                elements.tapestry.aegisToggle.click();
            }

            state.isHorizonActive = !state.isHorizonActive;
            elements.tapestry.horizonToggle.classList.toggle(
                'active',
                state.isHorizonActive
            );
            elements.tapestry.horizonDashboard.classList.toggle(
                'visible',
                state.isHorizonActive
            );

            if (state.isHorizonActive) {
                this.updateHorizonDashboard();
                this.startHorizonLoop();
            } else {
                this.stopHorizonLoop();
                this.render(); // One last render to clear ghosts
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Map Interaction (Overwatch)
        elements.tapestry.mapToggle.addEventListener('click', () => {
            state.isMapActive = !state.isMapActive;
            elements.tapestry.mapToggle.classList.toggle('active', state.isMapActive);

            // Exclusive Mode Logic
            if (state.isMapActive) {
                state.isSynapseActive = false;
                elements.tapestry.synapseToggle.classList.remove('active');

                elements.tapestry.canvas.style.display = 'none';
                elements.tapestry.mapCanvas.style.display = 'block';
                if (!this.mapRenderer) this.mapRenderer = new MapRenderer(elements.tapestry.mapCanvas);
                this.mapRenderer.resize();
                this.mapRenderer.render(tapestryLedger.getThreads(), locations);
            } else {
                // Return to previous state or default?
                // If map is off, we show mandala (or synapse if it was active? No, we turned it off).
                // Default to Mandala.
                elements.tapestry.canvas.style.display = 'block';
                elements.tapestry.mapCanvas.style.display = 'none';
                this.render();
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Synapse Interaction
        elements.tapestry.synapseToggle.addEventListener('click', () => {
            state.isSynapseActive = !state.isSynapseActive;
            elements.tapestry.synapseToggle.classList.toggle('active', state.isSynapseActive);

            if (state.isSynapseActive) {
                // Disable Map
                state.isMapActive = false;
                elements.tapestry.mapToggle.classList.remove('active');
                elements.tapestry.mapCanvas.style.display = 'none';

                // Enable Canvas
                elements.tapestry.canvas.style.display = 'block';

                // Initialize Graph
                const threads = tapestryLedger.getThreads();
                // Pass Mnemosyne for semantic analysis
                const graph = cortex.analyze(threads, mnemosyne);
                if (!this.synapseRenderer) this.synapseRenderer = new SynapseRenderer(elements.tapestry.canvas);
                this.synapseRenderer.render(graph);

                this.startHorizonLoop(); // Start physics loop
            } else {
                this.render(); // Back to Mandala
                this.stopHorizonLoop(); // Unless Horizon is active?
                if (state.isHorizonActive) this.startHorizonLoop();
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Aegis Interaction
        elements.tapestry.aegisToggle.addEventListener('click', () => {
            // Close Horizon Dashboard if open (Mobile UX)
            if (state.isHorizonActive) {
                elements.tapestry.horizonToggle.click();
            }

            const isVisible =
                elements.tapestry.aegisHud.classList.toggle('visible');
            elements.tapestry.aegisToggle.classList.toggle('active', isVisible);

            if (isVisible) {
                aegis.renderDashboard('aegis-hud');
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Citadel Interaction
        elements.tapestry.citadelToggle.addEventListener('click', () => {
            if (!state.isMapActive) {
                // Auto-switch to map if not active
                elements.tapestry.mapToggle.click();
            }
            state.isCitadelActive = !state.isCitadelActive;
            elements.tapestry.citadelToggle.classList.toggle('active', state.isCitadelActive);

            if (this.mapRenderer) {
                this.mapRenderer.setDrawMode(state.isCitadelActive);
            }

            if (state.isCitadelActive) {
                ui.showNotification('CITADEL DEFENSE GRID: ACTIVE. DRAW ZONES.', 'info');
            } else {
                ui.showNotification('CITADEL DEFENSE GRID: STANDBY.', 'info');
            }
            resonanceEngine.playInteractionSound('click');
        });

        // Valkyrie Interaction (Project OVERWATCH)
        const valkyrieToggle = document.getElementById('valkyrie-toggle');
        if (valkyrieToggle) {
            valkyrieToggle.addEventListener('click', () => {
                valkyrieUI.toggle();
                resonanceEngine.playInteractionSound('click');
            });
        }

        // Prometheus Interaction
        const prometheusToggle = document.getElementById('prometheus-toggle');
        if (prometheusToggle) {
            prometheusToggle.addEventListener('click', () => {
                const isOnline = prometheusToggle.classList.toggle('active');
                if (isOnline) {
                    prometheus.start();
                } else {
                    prometheus.stop();
                }
                resonanceEngine.playInteractionSound('click');
            });
        }
    }
}
