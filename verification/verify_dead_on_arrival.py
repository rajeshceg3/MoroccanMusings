import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

PORT = 8091

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

def verify_doa():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Inject error BEFORE page loads
        context = browser.new_context()
        context.add_init_script("throw new Error('PRE-BOOT CRITICAL FAILURE');")
        page = context.new_page()

        print("Navigating to App with injected Pre-Boot Error...")
        try:
            page.goto(f"http://localhost:{PORT}")
        except:
            pass # Expect error potentially

        time.sleep(2)
        page.screenshot(path="verification/ux_dead_on_arrival.png")
        print("Captured Dead on Arrival.")

        browser.close()

if __name__ == "__main__":
    verify_doa()
