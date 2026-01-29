import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8100

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    # silent server
    import logging
    log = logging.getLogger("socketserver")
    log.setLevel(logging.ERROR)

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_mnemosyne():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
            context = browser.new_context()
            # Prevent Ghost Guide from popping up after 2s delay
            context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")

            page = context.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Loading App...")
            page.goto(f"http://localhost:{PORT}")
            page.wait_for_selector("#splash-screen")
            page.click("#splash-screen")

            # Double check guide isn't there
            page.evaluate("""
                const guide = document.getElementById('ghost-guide-overlay');
                if (guide) guide.classList.add('hidden');
            """)

            page.wait_for_selector("#astrolabe-screen")

            def weave(intention, time_val):
                print(f"Weaving {intention} {time_val}...")

                # Map intention to region manually to ensure state consistency
                region_map = {
                    'serenity': 'coast',
                    'vibrancy': 'medina',
                    'awe': 'sahara',
                    'legacy': 'kasbah'
                }
                region = region_map[intention]

                # Set state directly
                page.evaluate(f"""
                    state.intention = '{intention}';
                    state.time = '{time_val}';
                    state.region = '{region}';
                """)

                # Click center to enter Riad
                page.click(".astrolabe-center", force=True)

                # Check we arrived at Riad
                try:
                    page.wait_for_selector("#riad-screen.active", timeout=2000)
                except:
                    print("Failed to enter Riad screen. Path might be invalid or app error.")
                    sys.exit(1)

                # Click Weave
                page.click("#weave-button", force=True)

                # Wait a bit for animation
                time.sleep(1)

                # Click Back to return to Astrolabe
                page.click("#riad-screen #back-button", force=True)

                # Wait for return to astrolabe
                page.wait_for_selector("#astrolabe-screen.active", timeout=3000)
                time.sleep(0.5)

            # 1. Weave 'Serenity' (Coast) at 'Dawn'
            weave('serenity', 'dawn')

            # 2. Weave 'Vibrancy' (Medina) at 'Midday' (Distinct noise)
            # This ensures IDF doesn't zero out terms common to the Serenity threads
            weave('vibrancy', 'midday')

            # 3. Weave 'Serenity' (Coast) at 'Dawn' (Duplicate of 1)
            weave('serenity', 'dawn')

            # Now we have Thread 0 (Serenity/Dawn) and Thread 1 (Serenity/Dawn).

            # 3. Go to Tapestry
            print("Navigating to Tapestry...")
            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # 4. Select the first thread (index 0)
            print("Selecting Thread 0...")
            # We assume MandalaRenderer is initialized.
            # We can also verify by checking canvas existence.
            page.wait_for_selector("#tapestry-canvas")

            # Dispatch event on the CANVAS, not window
            page.evaluate("document.getElementById('tapestry-canvas').dispatchEvent(new CustomEvent('tapestry-thread-click', { detail: { index: 0 } }))")
            time.sleep(1)

            # 5. Check Mnemosyne UI
            print("Checking Mnemosyne UI...")
            mnemosyne_ui = page.locator("#mnemosyne-ui")

            if not mnemosyne_ui.is_visible():
                print("FAIL: Mnemosyne UI not visible")
                sys.exit(1)

            content = mnemosyne_ui.inner_text()
            print(f"Mnemosyne Content: {content}")

            if "RELATED THREADS" not in content:
                print("FAIL: Header missing")
                sys.exit(1)

            # Since Thread 1 is identical, it should be top match (100%).
            if "100%" not in content:
                 print("FAIL: Expected 100% match for duplicate thread")
                 sys.exit(1)

            print("SUCCESS: Mnemosyne verified.")

            # Screenshot
            page.screenshot(path="verification_mnemosyne.png")

            browser.close()

    except Exception as e:
        print(f"ERROR: {e}")
        # import traceback
        # traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_mnemosyne()
