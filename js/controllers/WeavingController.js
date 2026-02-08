export class WeavingController {
    constructor(context) {
        this.context = context;
    }

    async weave() {
        const {
            state,
            stratagem,
            ui,
            panopticon,
            resonanceEngine,
            tapestryLedger,
            mnemosyne,
            aegis,
            sentinel,
            valkyrie,
            citadel,
            elements
        } = this.context;

        if (state.isWeaving) return;

        // Stratagem Scenario Override
        if (stratagem.isActive) {
             const threadData = {
                intention: state.intention,
                time: state.time,
                region: state.region,
                title: state.activeLocation.title,
                content: state.activeLocation.narrative
            };
            await stratagem.addSimulatedThread(threadData);
            ui.showNotification('SIMULATION UPDATE: Thread woven.', 'info');
            return;
        }

        // Prevent weaving if in Replay Mode
        if (panopticon && panopticon.isReplaying) {
            ui.showNotification('SYSTEM HALTED: REPLAY MODE ACTIVE', 'error');
            return;
        }

        state.isWeaving = true;

        resonanceEngine.playInteractionSound('weave');

        // Persist the thread
        const newThread = await tapestryLedger.addThread({
            intention: state.intention,
            time: state.time,
            region: state.region,
            title: state.activeLocation.title,
            content: state.activeLocation.narrative
        });

        // Update Mnemosyne Index
        mnemosyne.addThread(newThread);

        // Capture state for Panopticon (Time Travel)
        if (panopticon) panopticon.capture();

        // Trigger Aegis Tactical Analysis
        aegis.analyze(tapestryLedger.getThreads());

        // Trigger Sentinel Threat Assessment
        const threatReport = sentinel.assess(tapestryLedger.getThreads());

        // Trigger Valkyrie Response Matrix
        valkyrie.evaluate(threatReport, tapestryLedger.getThreads());

        // Check Citadel Interference
        const zoneViolation = citadel.check(newThread);
        if (zoneViolation) {
             ui.showNotification(`ALERT: THREAD INTERCEPTS RESTRICTED ZONE ${zoneViolation.id}`, 'error');
             resonanceEngine.playInteractionSound('error');
        }

        if (threatReport.status !== 'STANDBY') {
            ui.showNotification(
                `SENTINEL ALERT: DEFCON ${threatReport.defcon}`,
                'warning'
            );
        }

        const thread = document.createElement('div');
        thread.className = 'thread-animation';
        const startRect = elements.riad.weaveButton.getBoundingClientRect();
        const endRect = elements.astrolabe.tapestryIcon.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        thread.style.left = `${startX}px`;
        thread.style.top = `${startY}px`;
        thread.style.width = `${distance}px`;
        thread.style.transform = `rotate(${angle}deg)`;
        thread.style.backgroundColor =
            elements.riad.weaveButton.dataset.color || 'var(--ochre-gold)';
        document.body.appendChild(thread);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animationDuration = prefersReducedMotion ? 0 : 600;
        const fadeDuration = prefersReducedMotion ? 0 : 200;

        thread.animate(
            [
                { transform: `rotate(${angle}deg) scaleX(0)` },
                { transform: `rotate(${angle}deg) scaleX(1)` }
            ],
            { duration: animationDuration, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' }
        ).onfinish = () => {
            thread.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: fadeDuration
            }).onfinish = () => {
                thread.remove();
                elements.astrolabe.tapestryIcon.classList.add(
                    'tapestry-icon-pulse'
                );
                setTimeout(() => {
                    elements.astrolabe.tapestryIcon.classList.remove(
                        'tapestry-icon-pulse'
                    );
                    state.isWeaving = false; // Reset the lock
                }, 500);
            };
        };
    }
}
