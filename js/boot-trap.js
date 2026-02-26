// CRITICAL BOOT ERROR TRAP
window.addEventListener('error', function(e) {
    // If UI system hasn't loaded yet, takeover splash
    if (!window.ui) {
        var splash = document.getElementById('splash-screen');
        if (splash) {
            splash.innerHTML = '<div style="color: #ff0055; text-align: center; font-family: monospace; padding: 2rem; font-size: 1.2rem; background: #000;">SYSTEM FAILURE: ' + e.message + '<br><br>TACTICAL REBOOT REQUIRED.</div>';
            splash.style.opacity = '1';
            splash.style.zIndex = '99999';
        }
    }
});