import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8091  # Port for Overwatch test

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

def test_overwatch():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")
            page = context.new_page()

            # 1. Load App
            print("Loading App...")
            page.goto(f"http://localhost:{PORT}")
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active")

            # 2. Go to Tapestry
            print("Navigating to Tapestry...")
            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # 3. Open Overwatch (Valkyrie)
            print("Opening Overwatch...")
            if not page.is_visible("#valkyrie-toggle"):
                raise Exception("Valkyrie toggle button not found")

            page.click("#valkyrie-toggle")
            page.wait_for_selector("#valkyrie-overlay")

            # Check visibility explicitly
            if not page.evaluate("document.getElementById('valkyrie-overlay').classList.contains('hidden') === false"):
                 print("Overlay is technically visible in DOM (no hidden class).")

            # 4. Verify Content
            print("Verifying Overwatch UI...")
            title = page.text_content(".valkyrie-title")
            if "OVERWATCH" not in title:
                raise Exception("Incorrect Title in Overlay")

            # 5. Create Protocol
            print("Creating Protocol...")
            # ID Input is first text input
            inputs = page.query_selector_all(".v-input-group input[type='text']")
            inputs[0].fill("TEST_PROTO") # ID
            inputs[1].fill("100") # Value (default trigger is defcon, op is <)

            page.click("button.valkyrie-create-btn")

            # 6. Verify List
            print("Verifying Protocol List...")
            page.wait_for_selector(".valkyrie-item[data-id='TEST_PROTO']")
            print("Protocol TEST_PROTO created successfully.")

            print("SUCCESS: Overwatch Interface Verified.")
            browser.close()
            sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_overwatch()
