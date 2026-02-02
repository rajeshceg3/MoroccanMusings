import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8092

def run_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving on port {PORT}")
        httpd.serve_forever()

def test_stratagem():
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

            # 2. Open Terminal
            print("Opening Terminal...")
            page.keyboard.press("Control+Space")
            page.wait_for_selector(".terminal-window")

            # 3. Start Wargame
            print("Initiating Wargame...")
            page.fill("#terminal-input", "wargame start")
            page.keyboard.press("Enter")

            # 4. Verify Overlay
            print("Verifying Stratagem Overlay...")
            page.wait_for_selector("#stratagem-overlay")
            if "hidden" in page.get_attribute("#stratagem-overlay", "class"):
                raise Exception("Overlay is hidden")

            # 5. Add Simulated Thread
            print("Adding Simulated Thread...")
            page.click("button:has-text('+ THREAD')")
            # Wait for update
            time.sleep(0.5)

            # 6. Step Simulation
            print("Stepping Simulation...")
            initial_tick = page.text_content("#sim-tick")
            print(f"Initial Tick: {initial_tick}")
            page.click("button:has-text('Step >')")
            time.sleep(0.5)
            new_tick = page.text_content("#sim-tick")
            print(f"New Tick: {new_tick}")

            if int(new_tick) <= int(initial_tick):
                raise Exception("Simulation did not advance")

            # 7. Abort
            print("Aborting...")
            page.click(".abort-btn")
            time.sleep(0.5)

            if "hidden" not in page.get_attribute("#stratagem-overlay", "class"):
                raise Exception("Overlay did not close")

            print("SUCCESS: Stratagem Operations Verified.")
            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_stratagem()
