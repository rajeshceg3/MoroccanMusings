import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8090

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_stratcom():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
        page = browser.new_page()

        try:
            page.goto(f"http://localhost:{PORT}")

            # Dismiss Splash
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active", timeout=5000)

            # Activate Stratcom
            # window.terminal is exposed. commandRegistry is public.
            page.evaluate("window.terminal.commandRegistry['stratcom'].callback(['active'])")

            # Wait for overlay
            overlay = page.wait_for_selector("#stratcom-overlay", state="visible")

            # Wait for data pop
            time.sleep(1)

            # Screenshot
            if not os.path.exists("verification"):
                os.makedirs("verification")

            screenshot_path = "verification/stratcom_visual.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_stratcom()
