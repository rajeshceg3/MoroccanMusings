export class AstrolabeUI {
    constructor(elements, state, resonanceEngine) {
        this.elements = elements;
        this.state = state;
        this.resonanceEngine = resonanceEngine;

        this.updateAstrolabeState = this.updateAstrolabeState.bind(this);
        this.updateCenterText = this.updateCenterText.bind(this);
        this.setupRing = this.setupRing.bind(this);
    }

    init() {
        this.updateAstrolabeState();
    }

    setupRing(ringElement, snapAngles, onSnap) {
        let startAngle = 0;
        let currentRotation = 0;

        const getAngle = (e) => {
            const rect = ringElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return (
                Math.atan2(clientY - centerY, clientX - centerX) *
                (180 / Math.PI)
            );
        };

        const drag = (e) => {
            e.preventDefault();
            currentRotation = getAngle(e) - startAngle;
            ringElement.style.transform = `rotate(${currentRotation}deg)`;
        };

        const endDrag = () => {
            ringElement.classList.remove('dragging');
            ringElement.style.transition =
                'transform 0.8s var(--ease-out-quint)';
            document.body.style.cursor = 'default';

            const closestSnap = snapAngles.reduce((prev, curr) =>
                Math.abs(curr - (currentRotation % 360)) <
                Math.abs(prev - (currentRotation % 360))
                    ? curr
                    : prev
            );
            const revolutions = Math.round(currentRotation / 360);
            let finalRotation = revolutions * 360 + closestSnap;
            if (
                Math.abs(currentRotation - (finalRotation - 360)) <
                Math.abs(currentRotation - finalRotation)
            ) {
                finalRotation -= 360;
            }

            currentRotation = finalRotation;
            ringElement.style.transform = `rotate(${currentRotation}deg)`;
            if (navigator.vibrate) navigator.vibrate(10);
            this.resonanceEngine.playInteractionSound('click');
            onSnap(closestSnap);

            window.removeEventListener('mousemove', drag);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchmove', drag);
            window.removeEventListener('touchend', endDrag);
        };

        const startDrag = (e) => {
            ringElement.classList.add('dragging');
            ringElement.style.transition = 'none';
            startAngle = getAngle(e) - currentRotation;
            document.body.style.cursor = 'grabbing';

            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', endDrag);
            window.addEventListener('touchmove', drag, { passive: false });
            window.addEventListener('touchend', endDrag);
        };

        ringElement.addEventListener('mousedown', startDrag);
        ringElement.addEventListener('touchstart', startDrag, {
            passive: false
        });

        // Keyboard support
        ringElement.setAttribute('tabindex', '0');
        ringElement.setAttribute('role', 'slider');
        ringElement.setAttribute(
            'aria-label',
            ringElement.id === 'ring-intention' ? 'Intention Ring' : 'Time Ring'
        );

        ringElement.addEventListener('keydown', (e) => {
            let rotationChange = 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
                rotationChange = -90;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
                rotationChange = 90;

            if (rotationChange !== 0) {
                e.preventDefault();
                currentRotation += rotationChange;
                ringElement.style.transition =
                    'transform 0.5s var(--ease-out-quint)';
                ringElement.style.transform = `rotate(${currentRotation}deg)`;

                // Find closest snap point (simplified for keyboard: just snap to next quadrant)
                const closestSnap = snapAngles.reduce((prev, curr) =>
                    Math.abs(curr - (currentRotation % 360)) <
                    Math.abs(prev - (currentRotation % 360))
                        ? curr
                        : prev
                );
                onSnap(closestSnap);
            }
        });
    }

    updateAstrolabeState() {
        const keys = {
            intention: ['serenity', 'vibrancy', 'awe', 'legacy'],
            time: ['dawn', 'midday', 'dusk', 'night']
        };

        const updateSelection = (ring, angle) => {
            const index = (Math.round(angle / 90) + 4) % 4;
            this.state[ring] = keys[ring][index];
            const markers = this.elements.astrolabe.markers[ring];
            markers.forEach((m, i) =>
                m.classList.toggle('selected-marker', i === index)
            );
            this.updateCenterText();
        };

        this.setupRing(
            this.elements.astrolabe.rings.intention,
            [0, -90, -180, -270],
            (angle) => updateSelection('intention', angle)
        );
        this.setupRing(
            this.elements.astrolabe.rings.time,
            [0, -90, -180, -270],
            (angle) => updateSelection('time', angle)
        );

        // Initialize state
        updateSelection('intention', 0);
        updateSelection('time', 0);
    }

    updateCenterText() {
        if (this.state.intention && this.state.time) {
            const regionMap = {
                serenity: 'coast',
                vibrancy: 'medina',
                awe: 'sahara',
                legacy: 'kasbah'
            };
            this.state.region = regionMap[this.state.intention];
            this.elements.astrolabe.centerText.textContent = `Find a path for ${this.state.intention} at ${this.state.time}`;
        } else {
            this.elements.astrolabe.centerText.textContent =
                'Use arrows or drag to align rings';
        }
        // Accessibility: Announce change
        this.elements.astrolabe.centerText.setAttribute('aria-live', 'polite');
    }
}
