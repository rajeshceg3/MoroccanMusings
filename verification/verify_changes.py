import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8087 # Using a new port for verification

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    # We need to serve from repo root, but __file__ is in verification/
    os.chdir("..")

    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_frontend():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f"http://localhost:{PORT}")

            # Wait for splash screen
            page.wait_for_selector("#splash-screen")
            time.sleep(1) # Wait for animation

            # Click to enter
            page.click("#splash-screen")

            # Wait for Astrolabe
            page.wait_for_selector("#astrolabe-screen.active")
            time.sleep(2) # Wait for fade in

            # Check Astrolabe Helper Text
            text = page.locator(".center-text").text_content()
            print(f"Astrolabe Text: {text}")

            # Take screenshot of Astrolabe
            page.screenshot(path="verification/astrolabe.png")
            print("Screenshot saved to verification/astrolabe.png")

            # Focus on ring-intention to verify focus style (can't see in screenshot easily if headless, but we can try)
            page.focus("#ring-intention")
            page.screenshot(path="verification/focus_ring.png")

            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_frontend()
