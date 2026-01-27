import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8087 # Changed port to avoid conflict if previous didn't close properly

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    # silent server
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def test_app():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Capture console messages
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))

            page.goto(f"http://localhost:{PORT}")

            print("Checking Splash Screen...")
            splash = page.wait_for_selector("#splash-screen")
            if not splash.is_visible():
                print("FAIL: Splash screen not visible")
                sys.exit(1)

            print("Interacting with Splash Screen...")
            page.click("#splash-screen")

            print("Checking Astrolabe Screen...")
            page.wait_for_timeout(3000)
            astrolabe = page.wait_for_selector("#astrolabe-screen")

            if "active" not in astrolabe.get_attribute("class"):
                 print("FAIL: Astrolabe screen not active")
                 sys.exit(1)

            if console_errors:
                print("FAIL: Console errors detected:")
                for err in console_errors:
                    print(f"  - {err}")
                sys.exit(1)

            print("SUCCESS: Integration test passed with no errors.")
            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_app()
