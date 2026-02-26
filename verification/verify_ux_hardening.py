import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

PORT = 8090

class ProjectRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path == '/sw.js' or path == '/manifest.json':
            root = os.getcwd()
            return os.path.join(root, 'public', path.lstrip('/'))
        return super().translate_path(path)

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = ProjectRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_ux():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})

        # 1. Verify Normal Boot (Happy Path)
        print("Navigating to App (Normal Boot)...")
        page.goto(f"http://localhost:{PORT}")

        # Wait for splash or astrolabe
        # We expect normal boot, so splash should fade or be clickable
        page.wait_for_selector("#splash-screen")
        time.sleep(1)
        page.screenshot(path="verification/ux_normal_boot.png")
        print("Captured Normal Boot.")

        # 2. Verify Error State (Failure Injection)
        print("Injecting Critical Failure...")
        # We simulate a boot error by triggering window.onerror manually via console
        # or throwing an error before app loads?
        # Easier to just call the handler since we want to test the UI response.
        page.evaluate("window.dispatchEvent(new ErrorEvent('error', { message: 'SIMULATED CRITICAL FAILURE' }))")

        # Wait for red text
        time.sleep(1)
        page.screenshot(path="verification/ux_error_state.png")
        print("Captured Error State.")

        browser.close()

if __name__ == "__main__":
    verify_ux()
