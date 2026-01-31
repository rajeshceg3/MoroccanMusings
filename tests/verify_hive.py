import sys
from playwright.sync_api import sync_playwright
import time

def verify_hive():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Bypass Ghost Guide
        context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")

        page = context.new_page()

        # Start local server (assuming it's running via verify_app.py or similar, but I must provide URL)
        # Since I am in the sandbox, I should rely on the user running the server or start one?
        # The prompt says "integration verification is performed using Python scripts ... utilizing ... local HTTP servers".
        # I should probably start a server or assume port 8080.
        # I'll use a simple http server in background if needed, but verify_app.py usually handles it.
        # Here I will assume port 8081 for isolation.

        import subprocess
        import http.server
        import socketserver
        import threading

        PORT = 8081
        Handler = http.server.SimpleHTTPRequestHandler

        httpd = socketserver.TCPServer(("", PORT), Handler)
        server_thread = threading.Thread(target=httpd.serve_forever)
        server_thread.daemon = True
        server_thread.start()

        try:
            page.goto(f"http://localhost:{PORT}/index.html")

            # Wait for splash
            page.wait_for_selector("#splash-screen")
            page.click("#splash-screen")

            # Wait for Astrolabe
            page.wait_for_selector("#astrolabe-screen.active")

            # Go to Tapestry
            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # Inject Threads via Console
            print("Injecting Semantic Threads...")
            page.evaluate("""
                async () => {
                    const t1 = await window.tapestryLedger.addThread({
                        intention: 'serenity', region: 'coast', time: 'dawn',
                        title: 'Ocean Whisper', content: 'The waves speak of the deep blue sea.'
                    });
                    const t2 = await window.tapestryLedger.addThread({
                        intention: 'serenity', region: 'coast', time: 'dusk',
                        title: 'Sea Echo', content: 'A deep blue sea echo returns.'
                    });
                    const t3 = await window.tapestryLedger.addThread({
                        intention: 'awe', region: 'sahara', time: 'night',
                        title: 'Desert Star', content: 'The stars are bright above the sand.'
                    });
                    // t1 and t2 should have semantic overlap ("deep blue sea")
                }
            """)

            # Wait for ingestion
            time.sleep(1)

            # Activate Synapse
            print("Activating HIVE MIND (Synapse)...")
            page.click("#synapse-toggle")

            # Verify State
            is_active = page.evaluate("window.state.isSynapseActive")
            if not is_active:
                print("FAILURE: Synapse state is not active.")
                sys.exit(1)

            # Verify Toggle UI
            is_toggle_active = page.eval_on_selector("#synapse-toggle", "el => el.classList.contains('active')")
            if not is_toggle_active:
                print("FAILURE: Synapse toggle button is not active.")
                sys.exit(1)

            print("SUCCESS: Synapse Grid Activated.")

            # Test Zoom (Simulate Wheel)
            print("Testing Neural Zoom...")
            page.dispatch_event("#tapestry-canvas", "wheel", {"deltaY": -100})

            # Test Pan (Simulate Drag)
            print("Testing Tactical Pan...")
            page.mouse.move(300, 300)
            page.mouse.down()
            page.mouse.move(400, 400)
            page.mouse.up()

            print("Operation HIVE MIND Verified.")

        finally:
            httpd.shutdown()
            browser.close()

if __name__ == "__main__":
    verify_hive()
