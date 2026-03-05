window.__error_rendered__ = false;
window.onerror = function(message, source, lineno, colno, error) {
    console.error("CRITICAL FAILURE:", message, source, lineno);
    if (!window.__error_rendered__) {
        window.__error_rendered__ = true;
        const container = document.createElement('div');
        container.style.cssText = 'color: #c67605; font-family: monospace; padding: 2rem; text-align: center;';

        const title = document.createElement('h1');
        title.textContent = 'SYSTEM MALFUNCTION';

        const desc = document.createElement('p');
        desc.textContent = 'The tactical interface encountered a critical error.';

        const msg = document.createElement('p');
        msg.textContent = String(message);

        container.appendChild(title);
        container.appendChild(desc);
        container.appendChild(msg);

        document.body.appendChild(container);
    }
};
