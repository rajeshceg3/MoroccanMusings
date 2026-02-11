import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8091

class ProjectRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve from root
        root = os.getcwd()
        if path == '/sw.js' or path == '/manifest.json':
            return os.path.join(root, 'public', path.lstrip('/'))
        return super().translate_path(path)

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = ProjectRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server started on port {PORT}")
        httpd.serve_forever()

def verify_guide_interaction():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Ensure fresh context (no marq_onboarded)
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            page = context.new_page()

            print("Accessing App...")
            page.goto(f"http://localhost:{PORT}")

            # 1. Dismiss Splash
            page.wait_for_selector("#splash-screen.active")
            page.click("#splash-screen")

            # 2. Wait for Guide Overlay
            print("Waiting for Ghost Guide...")
            try:
                page.wait_for_selector("#ghost-guide-overlay:not(.hidden)", timeout=5000)
                print("Guide Overlay Visible.")
            except:
                print("FAIL: Guide Overlay did not appear.")
                browser.close()
                sys.exit(1)

            # 3. Attempt to Click Astrolabe Center (Should navigate to Riad)
            print("Attempting to click through overlay...")
            try:
                # Force click won't prove anything (it bypasses overlay checks in playwright sometimes).
                # We want a standard click.
                # Playwright's click checks for visibility and overlay obstruction.
                # If overlay obstructs, it might throw "Element is not clickable".
                # Or if it clicks the overlay instead, nothing happens.

                # We specifically target the center button underneath
                page.click(".astrolabe-center", timeout=2000)

                # Check if we navigated to Riad
                page.wait_for_selector("#riad-screen.active", timeout=2000)
                print("SUCCESS: Click passed through overlay. Navigated to Riad.")

            except Exception as e:
                print(f"FAIL: Click intercepted or navigation failed. Error: {e}")
                # Check if we are still on Astrolabe
                if page.is_visible("#astrolabe-screen.active"):
                    print("Still on Astrolabe Screen (Expected behavior before fix).")
                browser.close()
                sys.exit(1)

            browser.close()
            sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_guide_interaction()
