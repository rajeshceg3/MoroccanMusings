import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8088  # Different port to avoid conflicts

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_full_cycle():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Disable Ghost Guide for this test
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")
            page = context.new_page()

            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))

            # 1. Splash
            print("Accessing Splash...")
            page.goto(f"http://localhost:{PORT}")
            page.wait_for_selector("#splash-screen.active")
            page.click("#splash-screen")

            # 2. Astrolabe
            print("Accessing Astrolabe...")
            page.wait_for_selector("#astrolabe-screen.active")

            # Select Default Path
            print("Aligning Astrolabe (Default)...")
            page.click(".astrolabe-center")

            # 3. Riad
            print("Entering Riad...")
            page.wait_for_selector("#riad-screen.active")

            # Verify Content Loaded
            title = page.text_content("#riad-title")
            print(f"Riad Location: {title}")
            if not title:
                raise Exception("Riad title empty")

            # 4. Weave
            print("Weaving Thread...")
            # Wait for button to be visible (animation delay)
            page.wait_for_selector("#weave-button.visible", timeout=5000)
            page.click("#weave-button")

            # Wait for thread animation thread-animation class
            # It might be fast, so we might miss checking the element itself,
            # but we can check if the Tapestry Icon pulses or just wait a bit.
            # js/app.js: isWeaving = true -> animate -> isWeaving = false
            time.sleep(1) # Wait for animation

            # 5. Tapestry
            print("Navigating to Tapestry...")
            # Must exit Riad first
            page.evaluate("document.getElementById('back-button').click()")
            page.wait_for_selector("#astrolabe-screen.active")

            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # Verify Canvas exists
            if not page.is_visible("#tapestry-canvas"):
                raise Exception("Tapestry canvas not visible")

            if console_errors:
                print("FAIL: Console errors detected:")
                for err in console_errors:
                    print(f"  - {err}")
                sys.exit(1)

            print("SUCCESS: Full Weave Cycle Verified.")
            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_full_cycle()
