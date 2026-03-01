export class MandalaRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.selectedIndices = []; // Added for selection state
        this.focusedIndex = -1; // For keyboard navigation

        // Shadow DOM for Accessibility
        this.a11yContainer = document.createElement('div');
        this.a11yContainer.id = 'tapestry-a11y-layer';
        this.a11yContainer.style.cssText =
            'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden; z-index:10;';
        this.canvas.parentElement.appendChild(this.a11yContainer);
        this.canvas.parentElement.style.position = 'relative'; // Ensure parent is positioned

        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.lastA11yHash = null; // Force A11y update on resize
    }

    setSelection(indices) {
        this.selectedIndices = indices || [];
    }

    setFocus(index) {
        this.focusedIndex = index;
    }

    render(threads, projections = []) {
        // Optimization: Only update A11y tree if threads have changed
        const currentHash =
            threads.length +
            ':' +
            (threads.length > 0 ? threads[threads.length - 1].hash : '') +
            ':' +
            this.selectedIndices.join(',');
        if (this.lastA11yHash !== currentHash) {
            this.updateAccessibilityTree(threads); // Sync DOM
            this.lastA11yHash = currentHash;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background Gradient based on thread count
        const cx = this.width / 2;
        const cy = this.height / 2;

        const gradient = this.ctx.createRadialGradient(
            cx,
            cy,
            10,
            cx,
            cy,
            this.width / 1.5
        );
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (threads.length === 0 && projections.length === 0) {
            this.ctx.fillStyle = '#444';
            this.ctx.font = 'italic 16px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('The Loom awaits your thread.', cx, cy);
            return;
        }

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Base geometry
        threads.forEach((thread, i) => {
            // Safety check for hash
            if (!thread.hash) return;
            this.drawMandalaLayer(thread, i, threads.length);
        });

        // Projection geometry
        if (projections.length > 0) {
            projections.forEach((ghost, i) => {
                // Ghost index continues from last real thread
                this.drawMandalaLayer(
                    ghost,
                    threads.length + i,
                    threads.length + projections.length
                );
            });
        }

        this.ctx.restore();
    }

    updateAccessibilityTree(threads) {
        // Clear existing buttons
        this.a11yContainer.textContent = '';
        const cx = this.width / 2;
        const cy = this.height / 2;
        const fragment = document.createDocumentFragment();

        threads.forEach((thread, index) => {
            const btn = document.createElement('button');
            btn.setAttribute('type', 'button');
            btn.setAttribute(
                'aria-label',
                `Thread ${index + 1}: ${thread.title} (${thread.intention}, ${thread.time})`
            );
            btn.setAttribute(
                'aria-pressed',
                this.selectedIndices.includes(index) ? 'true' : 'false'
            );

            // Calculate approximate position for visual focus indicator (optional, mostly for tabbing)
            const radius = 40 + index * 20;

            btn.style.cssText = `
                position: absolute;
                left: ${cx / this.dpr}px;
                top: ${cy / this.dpr - radius}px;
                width: 20px;
                height: 20px;
                transform: translate(-50%, -50%);
                pointer-events: auto; /* Allow interaction */
                opacity: 0.01; /* Almost invisible but clickable for debugging/mouse */
                cursor: pointer;
             `;

            btn.addEventListener('focus', () => {
                this.setFocus(index);
                this.render(threads); // Re-render to show focus
            });

            btn.addEventListener('blur', () => {
                this.setFocus(-1);
                this.render(threads);
            });

            btn.addEventListener('click', (e) => {
                const event = new CustomEvent('tapestry-thread-click', {
                    detail: { index }
                });
                this.canvas.dispatchEvent(event);
            });

            fragment.appendChild(btn);
        });
        this.a11yContainer.appendChild(fragment);
    }

    drawMandalaLayer(thread, index, total) {
        // Use hash to determine geometric properties
        // Hash is hex string. We can parse parts of it.
        const hashVal = parseInt(thread.hash.substring(0, 8), 16);
        const sides = 3 + (hashVal % 12); // 3 to 14 sides
        const radius = 40 + index * 20; // Growing radius

        const isSelected = this.selectedIndices.includes(index);
        const isFocused = this.focusedIndex === index;
        const isGhost = thread.isGhost === true;

        const colors = {
            serenity: '#4a7c82',
            vibrancy: '#c67605',
            awe: '#b85b47',
            legacy: '#5d4037'
        };
        const baseColor = colors[thread.intention] || '#888';

        if (isFocused) {
            this.ctx.strokeStyle = '#55aaff'; // Focus color (Tactical Blue)
            this.ctx.lineWidth = 4 + index * 0.1;
        } else {
            this.ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
            this.ctx.lineWidth = isSelected
                ? 3 + index * 0.1
                : isGhost
                  ? 1
                  : 1 + index * 0.1;
        }

        if (isGhost) {
            this.ctx.setLineDash([5, 5]); // Dashed line for ghosts
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.2; // Pulsing
        } else {
            this.ctx.setLineDash([]);
            this.ctx.globalAlpha = isSelected
                ? 1.0
                : 0.6 + 0.4 * (index / total);
        }

        const rotationOffset = (hashVal % 360) * (Math.PI / 180);

        this.ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const theta = (i / sides) * 2 * Math.PI + rotationOffset;
            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Decoration points
        const decor = (hashVal >> 4) % 3;
        if (decor === 0 || isSelected) {
            // Dots at vertices
            for (let i = 0; i < sides; i++) {
                const theta = (i / sides) * 2 * Math.PI + rotationOffset;
                this.ctx.fillStyle = isSelected ? '#ffffff' : baseColor;
                this.ctx.beginPath();
                this.ctx.arc(
                    radius * Math.cos(theta),
                    radius * Math.sin(theta),
                    isSelected ? 4 : 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }
        }
    }

    getThreadIndexAt(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = x - rect.left - cx;
        const dy = y - rect.top - cy;

        // Correct distance calculation matches the drawing logic (drawing is independent of DPR scale visually in CSS pixels)
        // The drawing logic: radius = 40 + (index * 20)
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Tolerance: +/- 10 pixels (half the gap between rings)
        const estimatedIndex = (distance - 40) / 20;
        const roundedIndex = Math.round(estimatedIndex);

        // Check if within the valid "stroke width" area of the ring
        // The ring is at 40 + i*20.
        // Mobile Optimization: Increased tolerance to 2.0 (Maximized Hit Area)
        // This ensures the touch target allows for imprecise interaction (gloves/stress)
        // by utilizing the full available space between rings.
        if (
            Math.abs(estimatedIndex - roundedIndex) < 2.0 &&
            roundedIndex >= 0
        ) {
            return roundedIndex;
        }
        return -1;
    }
}
