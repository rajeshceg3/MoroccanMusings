import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8088  # Different port to avoid conflict

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_guide():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Create context with empty storage
            context = browser.new_context()
            page = context.new_page()

            # page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

            print("Navigating to app...")
            page.goto(f"http://localhost:{PORT}")

            # Dismiss Splash
            print("Dismissing splash...")
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen")

            # Wait for auto-show (2s delay in app.js)
            print("Waiting for Ghost Guide auto-show...")
            overlay = page.wait_for_selector("#ghost-guide-overlay:not(.hidden)", timeout=5000)

            # 1. Verify Backdrop
            print("Verifying Backdrop...")
            backdrop = page.locator(".guide-backdrop")
            if "visible" not in backdrop.get_attribute("class"):
                print("FAIL: Backdrop not visible")
                sys.exit(1)

            # 2. Verify Step 1 Spotlight (Astrolabe Container)
            print("Verifying Step 1 Spotlight...")
            step1_target = page.locator(".astrolabe-container")
            if "guide-spotlight" not in step1_target.get_attribute("class"):
                print("FAIL: Step 1 target (.astrolabe-container) is not spotlighted")
                sys.exit(1)

            # Screenshot
            verify_dir = os.path.join(os.getcwd(), "verification")
            os.makedirs(verify_dir, exist_ok=True)
            page.screenshot(path=os.path.join(verify_dir, "guide_spotlight.png"))

            # 3. Click Next
            print("Clicking Next...")
            page.click("#guide-next-btn")
            # Give animation/update a moment
            page.wait_for_timeout(500)

            # 4. Verify Step 2 Spotlight (Astrolabe Center)
            print("Verifying Step 2 Spotlight...")
            step2_target = page.locator(".astrolabe-center")
            if "guide-spotlight" not in step2_target.get_attribute("class"):
                print("FAIL: Step 2 target (.astrolabe-center) is not spotlighted")
                sys.exit(1)

            # 5. Verify Step 1 lost spotlight
            if "guide-spotlight" in step1_target.get_attribute("class"):
                print("FAIL: Step 1 target still has spotlight")
                sys.exit(1)

            # 6. Click Skip
            print("Clicking Skip...")
            page.click("#guide-skip-btn")
            # Wait for the overlay to be hidden (opacity 0 / display none)
            page.wait_for_selector("#ghost-guide-overlay", state="hidden")

            # 7. Verify Cleanup
            print("Verifying Cleanup...")
            if "guide-spotlight" in step2_target.get_attribute("class"):
                print("FAIL: Spotlight not removed after close")
                sys.exit(1)

            if "visible" in backdrop.get_attribute("class"):
                print("FAIL: Backdrop still visible after close")
                sys.exit(1)

            # 8. Verify Persistence
            onboarded = page.evaluate("localStorage.getItem('marq_onboarded')")
            if onboarded != 'true':
                 print(f"FAIL: LocalStorage persistence failed. Got: {onboarded}")
                 sys.exit(1)

            print("SUCCESS: Ghost Guide Verification Passed")
            browser.close()

    except Exception as e:
        print(f"ERROR: {e}")
        # import traceback
        # traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_guide()
