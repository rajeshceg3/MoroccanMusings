window.onerror = function(message, source, lineno, colno, error) {
    console.error("CRITICAL FAILURE:", message, source, lineno);
    if (document.body.innerHTML.trim() === '') {
       document.body.innerHTML = '<div style="color: #c67605; font-family: monospace; padding: 2rem; text-align: center;"><h1>SYSTEM MALFUNCTION</h1><p>The tactical interface encountered a critical error.</p><p>' + message + '</p></div>';
    }
};
