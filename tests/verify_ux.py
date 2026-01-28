import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8087

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_ux():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

            page.goto(f"http://localhost:{PORT}")

            # Dismiss Splash
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen")

            # Dismiss Ghost Guide if present
            try:
                skip_btn = page.wait_for_selector("#guide-skip-btn", timeout=3000)
                if skip_btn.is_visible():
                    skip_btn.click()
                    page.wait_for_selector("#ghost-guide-overlay", state="hidden")
            except:
                pass

            # Go to Tapestry
            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # Click Unravel (should trigger modal)
            print("Clicking Unravel...")
            page.click("#clear-tapestry")

            # Check Modal
            print("Checking Modal...")
            modal = page.wait_for_selector("#confirm-modal")

            # Verify class presence
            if "visible" not in modal.get_attribute("class"):
                print("FAIL: Modal does not have visible class")
                sys.exit(1)

            # Screenshot
            os.makedirs("/home/jules/verification", exist_ok=True)
            page.screenshot(path="/home/jules/verification/modal.png")

            # Click Cancel
            print("Clicking Cancel...")
            page.click(".confirm-btn.cancel")
            page.wait_for_timeout(500)

            if "visible" in modal.get_attribute("class"):
                print("FAIL: Modal still has visible class after cancel")
                sys.exit(1)

            # Click Unravel again
            page.click("#clear-tapestry")
            page.wait_for_selector("#confirm-modal.visible")

            # Click Confirm
            print("Clicking Confirm...")
            page.click(".confirm-btn.ok")
            page.wait_for_timeout(500)

            if "visible" in modal.get_attribute("class"):
                print("FAIL: Modal still has visible class after confirm")
                sys.exit(1)

            # Check Notification
            print("Checking Notification...")
            # Wait for toast to appear
            toast = page.wait_for_selector(".toast-info")
            if not toast.is_visible():
                print("FAIL: Notification not shown")
                sys.exit(1)

            text_toast = toast.text_content()
            if "unraveled" not in text_toast:
                 print(f"FAIL: Notification text mismatch: {text_toast}")
                 sys.exit(1)

            print("SUCCESS: UX Verification Passed")
            browser.close()

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_ux()
