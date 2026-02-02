export class RiadUI {
    constructor(elements, state, resonanceEngine, ui, chronos, tapestryLedger, callbacks) {
        this.elements = elements;
        this.state = state;
        this.resonanceEngine = resonanceEngine;
        this.ui = ui;
        this.chronos = chronos;
        this.tapestryLedger = tapestryLedger;
        this.callbacks = callbacks; // { showScreen, weaveThread }

        // Bind methods
        this.show = this.show.bind(this);
        this.setupInteractions = this.setupInteractions.bind(this);
    }

    show(locationData) {
        this.state.activeLocation = locationData;

        // Reset
        this.elements.riad.imageContainer.style.display = 'block';
        document.querySelector('.riad-content').style.marginTop = '100vh';

        this.elements.riad.imageElement.onerror = () => {
            this.elements.riad.imageContainer.style.display = 'none'; // Hide the container on failure
            document.querySelector('.riad-content').style.marginTop = '0'; // Adjust layout
        };
        this.elements.riad.imageElement.loading = 'lazy'; // Native lazy loading
        this.elements.riad.imageElement.src = locationData.image;

        this.elements.riad.title.textContent = locationData.title;
        this.elements.riad.title.classList.add('glitch');
        setTimeout(() => this.elements.riad.title.classList.remove('glitch'), 600);
        this.elements.riad.subtitle.textContent = locationData.subtitle;
        this.ui.typewriterEffect(this.elements.riad.narrative, locationData.narrative);

        this.elements.riad.sensory.sight.dataset.color = locationData.sensory.sight.color;
        this.elements.riad.sensory.sightDesc.textContent = locationData.sensory.sight.desc;
        this.elements.riad.sensory.sound.dataset.audio = locationData.sensory.sound.audio;
        this.elements.riad.sensory.soundDesc.textContent = locationData.sensory.sound.desc;
        this.elements.riad.sensory.scentDesc.textContent = locationData.sensory.scent.desc;
        this.elements.riad.sensory.touchDesc.textContent = locationData.sensory.touch.desc;

        this.elements.riad.foundation.text.textContent = locationData.foundation;
        this.elements.riad.weaveButton.dataset.color = locationData.sensory.sight.color;

        this.elements.screens.riad.scrollTop = 0;
        this.elements.riad.imageContainer.style.opacity = 1;
        this.elements.riad.weaveButton.classList.remove('visible');
        this.elements.riad.simulateButton.classList.remove('visible');
        setTimeout(() => {
            this.elements.riad.weaveButton.classList.add('visible');
            this.elements.riad.simulateButton.classList.add('visible');
        }, 1500);

        this.callbacks.showScreen('riad');
    }

    setupInteractions() {
        this.elements.riad.backButton.addEventListener('click', () => {
            this.callbacks.showScreen('astrolabe');
            this.elements.riad.weaveButton.classList.remove('visible');
            this.elements.riad.simulateButton.classList.remove('visible');
            // Stop ambience when going back
            this.resonanceEngine.stopAmbience();
        });

        this.elements.screens.riad.addEventListener('scroll', () => {
            const scrollY = this.elements.screens.riad.scrollTop;
            const opacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.7));
            this.elements.riad.imageContainer.style.opacity = opacity;
        });

        const setupSensoryItem = (element, action) => {
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
            const handler = (e) => {
                if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    action(e);
                }
            };
            element.addEventListener('click', handler);
            element.addEventListener('keydown', handler);
        };

        setupSensoryItem(this.elements.riad.sensory.sight, (e) => {
            const color = e.currentTarget.dataset.color;
            this.elements.colorWash.style.backgroundColor = color;
            this.elements.colorWash.style.opacity = 1;
            setTimeout(() => {
                this.elements.colorWash.style.opacity = 0;
            }, 600);
            this.resonanceEngine.playInteractionSound('click');
        });

        setupSensoryItem(this.elements.riad.sensory.sound, (e) => {
            this.resonanceEngine.resume();
            this.resonanceEngine.playInteractionSound('snap');
        });

        setupSensoryItem(this.elements.riad.sensory.scent, () =>
            this.resonanceEngine.playInteractionSound('click')
        );
        setupSensoryItem(this.elements.riad.sensory.touch, () =>
            this.resonanceEngine.playInteractionSound('click')
        );

        this.elements.riad.foundation.toggle.setAttribute('tabindex', '0');
        this.elements.riad.foundation.toggle.setAttribute('role', 'button');
        this.elements.riad.foundation.toggle.setAttribute('aria-expanded', 'false');

        const toggleFoundation = () => {
            const isOpen = this.elements.riad.foundation.details.classList.toggle('open');
            this.elements.riad.foundation.plusIcon.classList.toggle('open');
            this.elements.riad.foundation.toggle.setAttribute('aria-expanded', isOpen);
            this.resonanceEngine.playInteractionSound('click');
        };

        this.elements.riad.foundation.toggle.addEventListener('click', toggleFoundation);
        this.elements.riad.foundation.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFoundation();
            }
        });

        let pressTimer = null;
        let isLongPress = false;
        const LONG_PRESS_DURATION = 400;

        const startPress = (e) => {
            if (this.state.isWeaving) return;
            if (e.type === 'mousedown' && e.button !== 0) return;

            isLongPress = false;
            this.elements.riad.weaveButton.classList.add('pressing');

            pressTimer = setTimeout(() => {
                isLongPress = true;
                this.callbacks.weaveThread();
            }, LONG_PRESS_DURATION);
        };

        const endPress = (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            this.elements.riad.weaveButton.classList.remove('pressing');
        };

        const handleClick = (e) => {
            if (isLongPress) {
                isLongPress = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            this.callbacks.weaveThread();
        };

        this.elements.riad.weaveButton.addEventListener('pointerdown', startPress);
        this.elements.riad.weaveButton.addEventListener('pointerup', endPress);
        this.elements.riad.weaveButton.addEventListener('pointerleave', endPress);
        this.elements.riad.weaveButton.addEventListener('click', handleClick);

        this.elements.riad.weaveButton.setAttribute('tabindex', '0');
        this.elements.riad.weaveButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.callbacks.weaveThread();
            }
        });

        this.elements.riad.simulateButton.addEventListener('click', () => {
            const proposed = {
                intention: this.state.intention,
                time: this.state.time,
                region: this.state.region,
                title: this.state.activeLocation.title
            };

            const report = this.chronos.simulate(this.tapestryLedger.getThreads(), proposed);

            this.ui.showSimulationResults(report, () => {
                this.callbacks.weaveThread();
            });
            this.resonanceEngine.playInteractionSound('click');
        });

        this.elements.riad.simulateButton.setAttribute('tabindex', '0');
        this.elements.riad.simulateButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.elements.riad.simulateButton.click();
            }
        });
    }
}
