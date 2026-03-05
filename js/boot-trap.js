// CRITICAL BOOT ERROR TRAP
window.addEventListener('error', function(e) {
    // If UI system hasn't loaded yet, takeover splash
    if (!window.ui) {
        var splash = document.getElementById('splash-screen');
        if (splash) {
            e.preventDefault();
            var errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ff0055; background: #000; font-family: monospace; padding: 2rem; font-size: 1.5rem; z-index: 999999; text-align: center; box-sizing: border-box;';

            var errorTitle = document.createElement('h1');
            errorTitle.textContent = 'SYSTEM FAILURE';

            var errorDetail = document.createElement('p');
            errorDetail.textContent = e.message;

            var errorAction = document.createElement('p');
            errorAction.textContent = 'TACTICAL REBOOT REQUIRED.';
            errorAction.style.marginTop = '2rem';

            errorMsg.appendChild(errorTitle);
            errorMsg.appendChild(errorDetail);
            errorMsg.appendChild(errorAction);

            splash.textContent = '';
            splash.appendChild(errorMsg);
            splash.style.opacity = '1';
            splash.style.zIndex = '99999';
        }
    }
});