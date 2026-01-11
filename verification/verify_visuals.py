import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8088

def run_server():
    # correctly set directory to repo root
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_visuals():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Go to app
            page.goto(f"http://localhost:{PORT}")

            # 1. Splash Screen
            page.wait_for_selector("#splash-screen")
            page.screenshot(path="verification/splash.png")
            print("Captured splash.png")

            # 2. Astrolabe
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active")
            time.sleep(1) # Wait for fade
            page.screenshot(path="verification/astrolabe.png")
            print("Captured astrolabe.png")

            # 3. Notification Test
            page.evaluate("window.showNotification('System Secure', 'success')")
            time.sleep(0.5) # Wait for animation
            page.screenshot(path="verification/notification.png")
            print("Captured notification.png")

            # 4. Riad Screen (Weave Button)
            # navigate via console to save complex interaction
            page.evaluate("window.state.intention='serenity'; window.state.time='dawn'; window.state.region='coast';")
            page.evaluate("showScreen('riad')")
            page.wait_for_selector("#riad-screen.active")
            time.sleep(1)

            # Focus weave button to show focus style (if any) or just presence
            page.evaluate("document.getElementById('weave-button').focus()")
            page.screenshot(path="verification/riad_weave.png")
            print("Captured riad_weave.png")

            browser.close()
            print("Verification complete.")

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_visuals()
