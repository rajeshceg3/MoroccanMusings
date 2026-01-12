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
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_ui():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Hook into console to detect errors
            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
            page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

            page.goto(f"http://localhost:{PORT}")

            # Wait for app to load
            page.wait_for_selector("#splash-screen")

            # Execute a toast notification manually via the exposed UI object or window.showNotification
            print("Triggering notification...")
            page.evaluate("window.showNotification('Test Notification', 'success')")

            # Check if container exists
            container = page.wait_for_selector("#notification-container")
            if not container:
                print("FAIL: Notification container not found.")
                sys.exit(1)

            # Check if toast appears
            toast = page.wait_for_selector(".toast.toast-success", state="visible")
            if not toast:
                print("FAIL: Toast element not found or not visible.")
                sys.exit(1)

            text = toast.text_content()
            if "Test Notification" not in text:
                print(f"FAIL: Toast text mismatch. Got: {text}")
                sys.exit(1)

            print("SUCCESS: UI System is functioning correctly.")
            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_ui()
