/**
 * Terminal Command Registry
 * Decouples command logic from the main application controller.
 * @module terminal-commands
 */

import { locations } from './data.js';

/**
 * Registers all available commands with the terminal system.
 * @param {TerminalSystem} terminal - The terminal instance
 * @param {Object} context - Dependency injection container
 * @param {AppState} context.state
 * @param {TapestryLedger} context.tapestryLedger
 * @param {Object} context.engines - { resonance, horizon, oracle, spectra, sentinel, aegis, codex, alchemy }
 * @param {Object} context.ui - UI System instance
 * @param {Object} context.elements - DOM Elements reference
 * @param {Object} context.actions - { showScreen, showRiad, weaveThread, renderTapestry }
 */
export function registerCommands(terminal, context) {
    // We destructure stable dependencies, but keep dynamic ones in context
    const { state, tapestryLedger, elements, actions } = context;
    // Engines like Oracle are lazy-loaded, so we access them via context.engines inside commands

    // Helper for locked check
    const checkAccess = () => {
        if (tapestryLedger.status === 'LOCKED') {
            terminal.log('ACCESS DENIED.', 'error');
            return false;
        }
        return true;
    };

    terminal.registerCommand('help', 'List available commands', () => {
        terminal.log('Available Commands:', 'system');
        Object.entries(terminal.commandRegistry).forEach(([name, cmd]) => {
            terminal.log(`  ${name.padEnd(10)} - ${cmd.description}`, 'info');
        });
    });

    terminal.registerCommand('clear', 'Clear terminal output', () => {
        terminal.output.textContent = '';
    });

    terminal.registerCommand('status', 'Show system status', () => {
        terminal.log('SYSTEM STATUS: NOMINAL', 'success');
        terminal.log(`Active Screen: ${state.activeScreen}`, 'info');
        terminal.log(
            `Ledger Integrity: ${tapestryLedger.isIntegrityVerified ? 'VERIFIED' : 'UNKNOWN'}`,
            tapestryLedger.isIntegrityVerified ? 'success' : 'warning'
        );
        terminal.log(
            `Encryption Status: ${tapestryLedger.status === 'LOCKED' ? 'LOCKED' : tapestryLedger.crypto.hasSession() ? 'UNLOCKED (SECURE)' : 'PLAINTEXT'}`,
            'info'
        );
        const threadCount = tapestryLedger.getThreads().length;
        terminal.log(`Thread Count: ${threadCount}`, 'info');
    });

    terminal.registerCommand(
        'auth',
        'Unlock the Secure Enclave',
        async (args) => {
            if (tapestryLedger.status !== 'LOCKED') {
                terminal.log(
                    'System is already unlocked or not encrypted.',
                    'info'
                );
                return;
            }
            if (args.length < 1) {
                terminal.log('Usage: auth <password>', 'warning');
                return;
            }
            const password = args.join(' ');
            const success = await tapestryLedger.unlock(password);
            if (success) {
                terminal.log(
                    'ACCESS GRANTED. DECRYPTION SUCCESSFUL.',
                    'success'
                );
                if (
                    elements.splash.calligraphy.textContent === 'SECURE ENCLAVE'
                ) {
                    elements.splash.calligraphy.textContent = 'أهلاً';
                    elements.splash.calligraphy.style.color = '#c67605';
                }
            } else {
                terminal.log('ACCESS DENIED. INVALID CREDENTIALS.', 'error');
            }
        }
    );

    terminal.registerCommand(
        'sys-encrypt',
        'Encrypt the Ledger (Set Password)',
        async (args) => {
            if (tapestryLedger.crypto.hasSession()) {
                terminal.log('Encryption already active.', 'warning');
                return;
            }
            if (args.length < 1) {
                terminal.log('Usage: sys-encrypt <password>', 'warning');
                return;
            }
            const password = args.join(' ');
            await tapestryLedger.enableEncryption(password);
            terminal.log(
                'ENCRYPTION ENABLED. Secure Enclave Active.',
                'success'
            );
        }
    );

    terminal.registerCommand(
        'sys-decrypt',
        'Remove Encryption (Warning: Data will be plaintext)',
        async () => {
            if (!tapestryLedger.crypto.hasSession()) {
                terminal.log('System is not encrypted.', 'info');
                return;
            }
            await tapestryLedger.disableEncryption();
            terminal.log(
                'ENCRYPTION DISABLED. Data is now plaintext.',
                'warning'
            );
        }
    );

    terminal.registerCommand(
        'sys-lock',
        'Immediately lock the system',
        async () => {
            if (!tapestryLedger.crypto.hasSession()) {
                terminal.log(
                    'System is not configured for encryption.',
                    'error'
                );
                return;
            }
            await tapestryLedger.lock();
            terminal.log(
                "SYSTEM LOCKED. REFRESH REQUIRED TO RE-AUTH OR USE 'auth'",
                'success'
            );
            location.reload();
        }
    );

    terminal.registerCommand(
        'jump',
        'Navigate to a location (e.g., jump serenity dawn)',
        (args) => {
            if (!checkAccess()) return;

            if (args.length < 2) {
                terminal.log('Usage: jump <intention> <time>', 'warning');
                return;
            }
            const intention = args[0].toLowerCase();
            const time = args[1].toLowerCase();

            const regionMap = {
                serenity: 'coast',
                vibrancy: 'medina',
                awe: 'sahara',
                legacy: 'kasbah'
            };
            const region = regionMap[intention];

            if (!region) {
                terminal.log(`Invalid intention: ${intention}`, 'error');
                return;
            }

            const path = `${intention}.${region}.${time}`;
            const targetLocation = locations[path];

            if (targetLocation) {
                terminal.log(
                    `Initiating jump to ${targetLocation.title}...`,
                    'success'
                );
                // Update state implicitly handled by UI/Resonance usually, but we update explicit state here
                state.intention = intention;
                state.region = region;
                state.time = time;

                context.engines.resonance.startAmbience(intention, time);
                actions.showScreen('riad');
                actions.showRiad(targetLocation);
                terminal.toggle();
            } else {
                terminal.log(`Location not found: ${path}`, 'error');
            }
        }
    );

    terminal.registerCommand(
        'weave',
        'Weave current location into tapestry',
        async () => {
            if (!checkAccess()) return;
            if (state.activeScreen !== 'riad') {
                terminal.log(
                    'Error: Must be at a Riad location to weave.',
                    'error'
                );
                return;
            }
            terminal.log('Initiating weave protocol...', 'info');
            await actions.weaveThread();
            terminal.log('Thread woven successfully.', 'success');
        }
    );

    terminal.registerCommand(
        'analyze',
        'Run strategic horizon analysis',
        () => {
            if (!checkAccess()) return;
            const threads = tapestryLedger.getThreads();
            const analysis = context.engines.horizon.analyze(threads);

            terminal.log('--- HORIZON ANALYSIS ---', 'system');
            terminal.log(
                `Dominance: ${analysis.dominance.intention} (${analysis.dominance.percent}%)`,
                'info'
            );
            terminal.log(
                `Balance Score: ${analysis.balanceScore}/100`,
                analysis.balanceScore > 70 ? 'success' : 'warning'
            );
            terminal.log(
                `Trajectory: ${analysis.lastIntention || 'None'} (Streak: ${analysis.streak})`,
                'info'
            );

            const insights = context.engines.horizon.project(threads);
            if (insights.length > 0) {
                terminal.log('Projected Vectors:', 'system');
                insights.forEach((ghost) => {
                    terminal.log(
                        `  [${ghost.type.toUpperCase()}] ${ghost.intention} @ ${ghost.time}`,
                        'info'
                    );
                });
            }
        }
    );

    terminal.registerCommand('history', 'List woven threads', () => {
        if (!checkAccess()) return;
        const threads = tapestryLedger.getThreads();
        if (threads.length === 0) {
            terminal.log('The Tapestry is empty.', 'info');
            return;
        }
        terminal.log(
            `--- TAPESTRY LEDGER (${threads.length} threads) ---`,
            'system'
        );
        threads.forEach((t, i) => {
            terminal.log(
                `[${i}] ${t.id} | ${t.intention.toUpperCase()} | ${t.title}`,
                'info'
            );
        });
    });

    terminal.registerCommand(
        'synthesize',
        'Fuse two threads (e.g., synthesize 0 1)',
        async (args) => {
            if (!checkAccess()) return;
            if (args.length < 2) {
                terminal.log('Usage: synthesize <index1> <index2>', 'warning');
                return;
            }
            const i1 = parseInt(args[0]);
            const i2 = parseInt(args[1]);
            const threads = tapestryLedger.getThreads();

            if (isNaN(i1) || isNaN(i2) || !threads[i1] || !threads[i2]) {
                terminal.log('Invalid thread indices.', 'error');
                return;
            }

            terminal.log(
                `Fusing threads ${threads[i1].id} and ${threads[i2].id}...`,
                'info'
            );

            try {
                const phantom = await context.engines.alchemy.fuse(
                    threads[i1],
                    threads[i2]
                );
                context.engines.resonance.playInteractionSound('weave');

                actions.showScreen('riad');
                actions.showRiad(phantom);

                elements.riad.title.style.color = '#c67605';
                elements.riad.subtitle.textContent = '✧ A PHANTOM REALM ✧';

                terminal.log(
                    'Synthesis Complete. Visualizing Phantom Realm.',
                    'success'
                );
                terminal.toggle();
            } catch (e) {
                terminal.log(`Synthesis failed: ${e.message}`, 'error');
            }
        }
    );

    terminal.registerCommand(
        'forge',
        'Create a steganographic shard from current tapestry',
        async () => {
            if (!checkAccess()) return;
            const threads = tapestryLedger.getThreads();
            if (threads.length === 0) {
                terminal.log(
                    'Tapestry is empty. Cannot forge shard.',
                    'warning'
                );
                return;
            }

            try {
                terminal.log('Initiating Codex encryption...', 'info');
                const blob = await context.engines.codex.forgeShard(threads);
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `codex_shard_${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);

                terminal.log(
                    'Shard forged and deployed to local system.',
                    'success'
                );
            } catch (e) {
                terminal.log(`Forge Protocol Failed: ${e.message}`, 'error');
            }
        }
    );

    terminal.registerCommand('scan', 'Initiate Shard scan sequence', () => {
        if (!checkAccess()) return;
        terminal.log('Engaging optical scanners...', 'info');
        elements.tapestry.shardInput.click();
        terminal.toggle();
    });

    terminal.registerCommand(
        'overwatch',
        'Toggle geospatial tactical display',
        () => {
            if (!checkAccess()) return;
            elements.tapestry.mapToggle.click();
            terminal.log(
                `Overwatch Display: ${state.isMapActive ? 'ACTIVE' : 'STANDBY'}`,
                'success'
            );
        }
    );

    terminal.registerCommand(
        'oracle',
        'Strategic Operations Interface',
        (args) => {
            if (!checkAccess()) return;

            const subcmd = args[0] || 'status';

            if (subcmd === 'status') {
                const oracle = context.engines.oracle;
                const ghosts = oracle
                    ? oracle.generateStrategicMap(tapestryLedger.getThreads())
                    : [];
                terminal.log('--- ORACLE STRATEGIC FORECAST ---', 'system');
                if (ghosts.length === 0) {
                    terminal.log(
                        'No data available for projection.',
                        'warning'
                    );
                } else {
                    ghosts.forEach((g) => {
                        terminal.log(
                            `[${g.type.toUpperCase()}] Target: ${g.locationTitle}`,
                            'info'
                        );
                        terminal.log(
                            `   > Vector: ${g.intention} @ ${g.time}`,
                            'info'
                        );
                        terminal.log(`   > Region: ${g.region}`, 'info');
                    });
                }
            } else if (subcmd === 'visual') {
                if (!state.isMapActive) elements.tapestry.mapToggle.click();

                const oracle = context.engines.oracle;
                if (oracle) {
                    const isActive = oracle.toggle();
                    terminal.log(
                        `Oracle Visual Layer: ${isActive ? 'ENGAGED' : 'DISENGAGED'}`,
                        isActive ? 'success' : 'warning'
                    );
                    actions.renderTapestry();
                } else {
                    terminal.log(
                        'Oracle Engine not initialized (Visit Tapestry first).',
                        'error'
                    );
                }
                terminal.toggle();
            } else {
                terminal.log('Usage: oracle [status|visual]', 'warning');
            }
        }
    );

    terminal.registerCommand(
        'signal',
        'Audio Steganography Operations',
        async (args) => {
            if (!checkAccess()) return;
            const subcmd = args[0];

            if (subcmd === 'encode') {
                const threads = tapestryLedger.getThreads();
                if (threads.length === 0) {
                    terminal.log(
                        'Tapestry is empty. No signal to broadcast.',
                        'warning'
                    );
                    return;
                }
                terminal.log('Modulating FSK carrier wave...', 'info');
                try {
                    const blob =
                        await context.engines.spectra.forgeSignal(threads);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `spectra_signal_${Date.now()}.wav`;
                    a.click();
                    URL.revokeObjectURL(url);
                    terminal.log(
                        'Signal broadcast generated. (WAV download)',
                        'success'
                    );
                } catch (e) {
                    terminal.log(
                        `Signal Generation Failed: ${e.message}`,
                        'error'
                    );
                }
            } else if (subcmd === 'decode') {
                terminal.log('Listening for incoming signals...', 'info');
                elements.tapestry.sonicShardInput.click();
                terminal.toggle();
            } else if (subcmd === 'analyze') {
                terminal.log(
                    'Spectral Analysis: FSK Carrier Protocol v1.0',
                    'info'
                );
                terminal.log('Freq: 16kHz/18kHz | Baud: 200', 'info');
            } else {
                terminal.log(
                    'Usage: signal [encode|decode|analyze]',
                    'warning'
                );
            }
        }
    );

    terminal.registerCommand(
        'sentinel',
        'Automated Threat Detection System',
        (args) => {
            if (!checkAccess()) return;
            const subcmd = args[0] || 'status';

            if (subcmd === 'status') {
                const report = context.engines.sentinel.assess(
                    tapestryLedger.getThreads()
                );
                const color =
                    report.defcon < 3
                        ? 'error'
                        : report.defcon < 5
                          ? 'warning'
                          : 'success';
                terminal.log(`--- SENTINEL WATCHTOWER ---`, 'system');
                terminal.log(`DEFCON: ${report.defcon}`, color);
                terminal.log(`Status: ${report.status}`, 'info');

                if (report.threats.length > 0) {
                    terminal.log('DETECTED THREATS:', 'warning');
                    report.threats.forEach((t) => {
                        terminal.log(
                            `[${t.level}] ${t.type}: ${t.message}`,
                            'error'
                        );
                    });
                } else {
                    terminal.log('No active threats detected.', 'success');
                }
            } else if (subcmd === 'scan') {
                terminal.log('Initiating full spectrum scan...', 'info');
                setTimeout(() => {
                    const report = context.engines.sentinel.assess(
                        tapestryLedger.getThreads()
                    );
                    if (report.threats.length > 0) {
                        terminal.log(
                            `SCAN COMPLETE. ${report.threats.length} ANOMALIES DETECTED.`,
                            'warning'
                        );
                    } else {
                        terminal.log('SCAN COMPLETE. SYSTEM CLEAN.', 'success');
                    }
                }, 800);
            } else {
                terminal.log('Usage: sentinel [status|scan]', 'warning');
            }
        }
    );

    terminal.registerCommand('aegis', 'Tactical Operations Control', (args) => {
        if (!checkAccess()) return;
        const subcmd = args[0] || 'status';

        if (subcmd === 'status') {
            const report = context.engines.aegis.getReport();
            terminal.log(
                '--- PROJECT AEGIS: OPERATIONAL REPORT ---',
                'tactical'
            );
            terminal.log(`Rank: ${report.rank.toUpperCase()}`, 'info');
            terminal.log(`XP: ${report.xp}`, 'info');
            terminal.log(
                `Completed Directives: ${report.completedCount}/${report.totalCount}`,
                'info'
            );
            terminal.log(
                '-----------------------------------------',
                'tactical'
            );

            if (report.active.length > 0) {
                terminal.log('ACTIVE DIRECTIVES:', 'system');
                report.active.forEach((m) => {
                    terminal.log(`[ ] ${m.codename}: ${m.description}`, 'info');
                });
            } else {
                terminal.log('ALL DIRECTIVES COMPLETE.', 'success');
            }
        } else if (subcmd === 'report') {
            const report = context.engines.aegis.getReport();
            terminal.log('--- SERVICE RECORD ---', 'tactical');
            if (report.badges.length > 0) {
                report.badges.forEach((b) =>
                    terminal.log(` * ${b}`, 'success')
                );
            } else {
                terminal.log('No commendations recorded.', 'info');
            }
        } else if (subcmd === 'hud') {
            elements.tapestry.aegisToggle.click();
            terminal.log('Toggling Tactical HUD...', 'info');
            terminal.toggle();
        } else {
            terminal.log('Usage: aegis [status|report|hud]', 'warning');
        }
    });

    terminal.registerCommand(
        'simulate',
        'Run Chronos Tactical Forecast',
        (args) => {
            if (!checkAccess()) return;
            if (args.length < 3) {
                terminal.log(
                    'Usage: simulate <intention> <region> <time>',
                    'warning'
                );
                return;
            }

            const intention = args[0].toLowerCase();
            const region = args[1].toLowerCase();
            const time = args[2].toLowerCase();

            // Validate inputs
            const validIntentions = ['serenity', 'vibrancy', 'awe', 'legacy'];
            const validTimes = ['dawn', 'midday', 'dusk', 'night'];

            if (!validIntentions.includes(intention)) {
                terminal.log(
                    `Invalid intention. Valid: ${validIntentions.join(', ')}`,
                    'error'
                );
                return;
            }

            if (!validTimes.includes(time)) {
                terminal.log(
                    `Invalid time. Valid: ${validTimes.join(', ')}`,
                    'error'
                );
                return;
            }

            const proposed = {
                intention,
                region,
                time,
                title: 'Simulated Node'
            };

            terminal.log('--- CHRONOS TACTICAL FORECAST ---', 'system');
            terminal.log('Running simulation...', 'info');

            const report = context.engines.chronos.simulate(
                tapestryLedger.getThreads(),
                proposed
            );

            terminal.log(
                `Baseline DEFCON: ${report.baseline.defcon} -> Projected: ${report.projected.defcon}`,
                'info'
            );

            const defconDelta = report.deltas.defcon;
            if (defconDelta > 0)
                terminal.log('IMPACT: THREAT REDUCTION', 'success');
            else if (defconDelta < 0)
                terminal.log('IMPACT: THREAT ESCALATION', 'error');
            else terminal.log('IMPACT: STABLE', 'info');

            terminal.log(
                `Balance Shift: ${report.deltas.balance >= 0 ? '+' : ''}${report.deltas.balance}%`,
                'info'
            );
            terminal.log(`Advisory: ${report.advisory}`, 'warning');
        }
    );

    terminal.registerCommand(
        'echo',
        'Real-time encrypted audio data link',
        async (args) => {
            if (!checkAccess()) return;
            const subcmd = args[0] || 'help';

            if (subcmd === 'broadcast') {
                const target = args[1] || 'profile';
                let data = null;

                if (target === 'profile') {
                    // Small payload: Aegis Profile
                    data = { type: 'profile', payload: context.engines.aegis.getReport() };
                } else if (target === 'thread') {
                     // Broadcast latest thread
                     const threads = tapestryLedger.getThreads();
                     if (threads.length === 0) {
                         terminal.log('No threads to broadcast.', 'error');
                         return;
                     }
                     data = { type: 'thread', payload: threads[threads.length - 1] };
                } else {
                    terminal.log('Usage: echo broadcast [profile|thread]', 'warning');
                    return;
                }

                terminal.toggle(); // Close terminal to show overlay

                const { close } = context.ui.showEchoInterface('broadcast', context.engines.spectra, () => {
                    // On manual close
                    terminal.log('Broadcast interrupted.', 'warning');
                });

                try {
                    await context.engines.spectra.broadcastSignal(data);
                    // broadcastSignal is blocking (awaits duration).
                    close(); // Close UI
                    terminal.log('Broadcast complete. Signal terminated.', 'success');
                    terminal.toggle(); // Re-open terminal
                } catch (e) {
                    close();
                    terminal.log(`Broadcast failed: ${e.message}`, 'error');
                }

            } else if (subcmd === 'listen') {
                terminal.toggle();
                let stopListening = null;

                const { close } = context.ui.showEchoInterface('listen', context.engines.spectra, () => {
                     // If user closes manually, we must stop listener
                     if (stopListening) stopListening();
                     terminal.log('Listener terminated.', 'warning');
                });

                try {
                    stopListening = await context.engines.spectra.listenSignal(
                        (data) => {
                            // On Data
                            close(); // Close UI

                            terminal.log('SIGNAL ACQUIRED. DECRYPTING...', 'success');
                            terminal.log(`Packet Type: ${data.type || 'UNKNOWN'}`, 'info');

                            // Handle Data
                            if (data.type === 'profile') {
                                terminal.log(`Contact: ${data.payload.rank} // XP: ${data.payload.xp}`, 'info');
                            } else if (data.type === 'thread') {
                                terminal.log(`Intel: ${data.payload.title}`, 'info');
                                terminal.log('Thread data verified. Security protocols active.', 'success');
                            } else {
                                terminal.log('Unknown payload structure.', 'warning');
                            }
                            terminal.toggle();
                        },
                        (status) => {
                            // Status update (optional)
                        }
                    );
                } catch (e) {
                    close();
                    terminal.log(`Listen initialization failed: ${e.message}`, 'error');
                    terminal.toggle();
                }

            } else {
                terminal.log('Usage: echo [broadcast|listen]', 'warning');
                terminal.log('  broadcast <profile|thread>', 'info');
            }
        }
    );

    terminal.registerCommand(
        'panopticon',
        'Tactical Replay System (Time Travel)',
        (args) => {
            if (!checkAccess()) return;
            const panopticon = context.engines.panopticon;

            if (!panopticon) {
                terminal.log('Panopticon Engine not initialized.', 'error');
                return;
            }

            // Ensure we are on the tapestry screen, or switch to it
            if (state.activeScreen !== 'tapestry') {
                actions.showScreen('tapestry');
            }

            panopticon.toggleInterface(true);
            terminal.log('PANOPTICON INTERFACE ENGAGED.', 'success');
            terminal.toggle(); // Close terminal to show UI
        }
    );

    terminal.registerCommand(
        'cortex',
        'Neural Association Engine',
        (args) => {
            if (!checkAccess()) return;

            const cmd = args[0] || 'status';
            const threads = tapestryLedger.getThreads();
            const analysis = context.engines.cortex.analyze(threads);

            if (cmd === 'status') {
                terminal.log('--- CORTEX NEURAL GRID ---', 'system');
                terminal.log(`Nodes: ${analysis.nodes.length}`, 'info');
                terminal.log(`Edges: ${analysis.edges.length}`, 'info');
                terminal.log(`Tactical Clusters: ${analysis.clusters.length}`, 'info');
            } else if (cmd === 'analyze') {
                terminal.log('--- NEURAL ANALYSIS ---', 'system');
                if (analysis.edges.length === 0) {
                    terminal.log('No semantic correlations detected.', 'warning');
                    return;
                }
                const strongest = analysis.edges.sort((a,b) => b.weight - a.weight)[0];
                terminal.log('Top Correlation:', 'success');
                const src = analysis.nodes[strongest.sourceIndex].data;
                const tgt = analysis.nodes[strongest.targetIndex].data;
                terminal.log(`  ${src.title} <--> ${tgt.title}`, 'info');
                terminal.log(`  Weight: ${strongest.weight}`, 'info');
                terminal.log(`  Vectors: ${strongest.types.join(', ')}`, 'info');
            } else if (cmd === 'cluster') {
                 if (analysis.clusters.length === 0) {
                     terminal.log('No clusters identified.', 'warning');
                     return;
                 }
                 terminal.log(`Identified ${analysis.clusters.length} clusters:`, 'system');
                 analysis.clusters.forEach((c, i) => {
                     terminal.log(`  Cluster ${i+1}: ${c.length} Nodes`, 'info');
                 });
            } else {
                terminal.log('Usage: cortex [status|analyze|cluster]', 'warning');
            }
        }
    );

    terminal.registerCommand(
        'valkyrie',
        'Autonomous Response Matrix Interface',
        (args) => {
            if (!checkAccess()) return;

            const subcmd = args[0] || 'status';
            const valkyrie = context.engines.valkyrie;
            const valkyrieUI = context.engines.valkyrieUI;

            if (subcmd === 'status') {
                terminal.log('--- PROJECT VALKYRIE: RESPONSE MATRIX ---', 'system');
                terminal.log(`Status: ${valkyrie.status}`, valkyrie.status === 'ACTIVE' ? 'success' : 'warning');
                terminal.log('Active Protocols:', 'info');
                valkyrie.getProtocols().forEach(p => {
                    terminal.log(`  [${p.active ? 'ON' : 'OFF'}] ${p.id}: ${p.name}`, p.active ? 'success' : 'warning');
                });
            } else if (subcmd === 'list') {
                 terminal.log('--- PROTOCOL DEFINITIONS ---', 'system');
                 valkyrie.getProtocols().forEach(p => {
                     terminal.log(`${p.id}`, 'info');
                     terminal.log(`  > IF [${p.condition}] THEN [${p.action}]`, 'info');
                 });
            } else if (subcmd === 'edit') {
                 if (valkyrieUI) {
                     valkyrieUI.toggle(true);
                     terminal.toggle(); // Close terminal to show UI
                     terminal.log('OPENING PROTOCOL EDITOR...', 'success');
                 } else {
                     terminal.log('Valkyrie UI not initialized.', 'error');
                 }
            } else if (subcmd === 'create') {
                if (args.length < 4) {
                    terminal.log('Usage: valkyrie create <ID> <CONDITION> <ACTION>', 'warning');
                    terminal.log('Example: valkyrie create RED_ALERT defcon<2 ALERT_HIGH', 'info');
                    return;
                }
                const id = args[1].toUpperCase();
                const condition = args[2];
                const action = args[3];

                try {
                    valkyrie.addProtocol({
                        id, condition, action, active: true
                    });
                    terminal.log(`Protocol ${id} CREATED.`, 'success');
                } catch (e) {
                    terminal.log(`Creation failed: ${e.message}`, 'error');
                }
            } else if (subcmd === 'delete') {
                const id = args[1];
                if (valkyrie.removeProtocol(id)) {
                    terminal.log(`Protocol ${id} DELETED.`, 'success');
                } else {
                    terminal.log(`Protocol ${id} not found.`, 'error');
                }
            } else if (subcmd === 'arm') {
                const id = args[1];
                if (valkyrie.toggleProtocol(id, true)) {
                    terminal.log(`Protocol ${id} ARMED.`, 'success');
                } else {
                    terminal.log(`Protocol ${id} not found.`, 'error');
                }
            } else if (subcmd === 'disarm') {
                const id = args[1];
                if (valkyrie.toggleProtocol(id, false)) {
                    terminal.log(`Protocol ${id} DISARMED.`, 'warning');
                } else {
                    terminal.log(`Protocol ${id} not found.`, 'error');
                }
            } else {
                terminal.log('Usage: valkyrie [status|list|edit|create|delete|arm|disarm]', 'warning');
            }
        }
    );

    terminal.registerCommand(
        'gemini',
        'Tactical Uplink Operations',
        (args) => {
            if (!checkAccess()) return;
            const subcmd = args[0] || 'status';
            const gemini = context.engines.gemini;

            if (!gemini) {
                terminal.log('Gemini Uplink not initialized.', 'error');
                return;
            }

            if (subcmd === 'status') {
                const peers = gemini.getPeerCount();
                terminal.log(
                    '--- PROJECT GEMINI: UPLINK STATUS ---',
                    'system'
                );
                terminal.log(
                    `Status: ${peers > 0 ? 'ACTIVE' : 'STANDBY'}`,
                    peers > 0 ? 'success' : 'warning'
                );
                terminal.log(`Connected Nodes: ${peers}`, 'info');
                terminal.log(`Local ID: ${gemini.id}`, 'info');
            } else if (subcmd === 'sync') {
                terminal.log('Forcing state synchronization...', 'info');
                gemini.broadcast('STATE_UPDATE', state); // Broadcast current state
                terminal.log('Sync packet broadcasted.', 'success');
            } else if (subcmd === 'detach') {
                // Open both
                context.ui.showNotification(
                    'Detaching Tactical Modules...',
                    'success'
                );
                window.open(
                    '?mode=map&uplink=true',
                    'MarqMap',
                    'width=1000,height=800'
                );
                window.open(
                    '?mode=terminal&uplink=true',
                    'MarqTerm',
                    'width=600,height=400'
                );
            } else {
                terminal.log('Usage: gemini [status|sync|detach]', 'warning');
            }
        }
    );
}
