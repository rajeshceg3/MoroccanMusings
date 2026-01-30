import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8089

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_guide():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Ensure fresh context for localStorage
            context = browser.new_context()
            page = context.new_page()

            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))

            print("Launching App...")
            page.goto(f"http://localhost:{PORT}")

            # Dismiss Splash
            page.wait_for_selector("#splash-screen.active")
            page.click("#splash-screen")

            # Wait for Guide (2000ms delay in code)
            print("Waiting for Ghost Guide...")
            page.wait_for_selector("#ghost-guide-overlay:not(.hidden)", timeout=5000)

            # Check Spotlight
            print("Verifying Spotlight...")
            spotlight = page.wait_for_selector(".guide-highlight-box")
            box_1 = spotlight.bounding_box()
            if not box_1 or box_1['width'] == 0:
                raise Exception("Spotlight box is invalid or hidden")

            # Check Step 1
            if not page.is_visible(".guide-step[data-step='1'].active"):
                raise Exception("Step 1 not active")

            # Click Next
            print("Advancing Guide...")
            page.click("#guide-next-btn")

            # Check Step 2
            page.wait_for_selector(".guide-step[data-step='2'].active")

            # Allow CSS transition (0.5s) to complete
            time.sleep(1)

            # Verify Spotlight moved
            box_2 = spotlight.bounding_box()
            print(f"Box 1: {box_1}")
            print(f"Box 2: {box_2}")

            # Assuming Step 1 (Container) and Step 2 (Center) are different sizes/pos
            if box_1['x'] == box_2['x'] and box_1['y'] == box_2['y']:
                 print("WARNING: Spotlight didn't move. Check layout.")
                 # Might be coincidentally same pos if centered?
                 # Container is 300x300 centered. Center is 60x60 centered.
                 # Top/Left might differ. width/height definitely differ.
                 if box_1['width'] == box_2['width']:
                     raise Exception("Spotlight didn't resize")

            # Click Skip
            print("Skipping Guide...")
            time.sleep(0.5)
            page.click("#guide-skip-btn")
            # Wait for overlay to be hidden
            page.wait_for_selector("#ghost-guide-overlay", state="hidden")

            # Check LocalStorage
            val = page.evaluate("localStorage.getItem('marq_onboarded')")
            if val != 'true':
                raise Exception("Onboarding state not saved")

            if console_errors:
                print("FAIL: Console errors detected:")
                for err in console_errors:
                    print(f"  - {err}")
                sys.exit(1)

            print("SUCCESS: Ghost Guide Verified.")
            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_guide()
