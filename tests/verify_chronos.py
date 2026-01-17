import sys
import os
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright

def run_server():
    server_address = ('', 8084)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    httpd.serve_forever()

def verify_chronos():
    # Start local server in background
    server_thread = Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()

    print("Starting Chronos verification...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load App
        page.goto("http://localhost:8084/index.html")
        page.wait_for_selector("#splash-screen")

        # Click splash to enter
        page.click("#splash-screen")
        page.wait_for_selector("#astrolabe-screen.active")
        print("Entered Astrolabe.")

        # 2. Use Terminal to Jump (Fast navigation)
        # Ensure focus
        page.click("body")
        page.keyboard.press("Backquote") # Use Backtick key

        page.wait_for_selector(".neural-link-overlay.active")
        print("Terminal opened.")

        page.keyboard.type("jump serenity dawn")
        page.keyboard.press("Enter")

        # Wait for Riad screen
        page.wait_for_selector("#riad-screen.active")
        print("Jumped to Riad.")

        # 3. Check Simulate Button
        # It has a delay to appear
        page.wait_for_selector("#simulate-button.visible", timeout=5000)
        print("Simulate button visible.")

        # 4. Click Simulate
        page.click("#simulate-button")

        # 5. Verify Modal
        page.wait_for_selector("#simulation-modal.visible")
        print("Simulation modal opened.")

        # Check content
        defcon_text = page.inner_text("#sim-defcon")
        balance_text = page.inner_text("#sim-balance")
        print(f"Simulation Results - DEFCON: {defcon_text}, Balance: {balance_text}")

        if not defcon_text or not balance_text:
            print("FAILED: Simulation data missing.")
            sys.exit(1)

        # 6. Execute (Confirm)
        page.click("#simulation-modal .confirm-btn.ok")
        print("Simulation confirmed.")

        # 7. Check if thread count increased
        # Open terminal and check status
        page.click("body")
        page.keyboard.press("Backquote")
        page.wait_for_selector(".neural-link-overlay.active")

        # Clear previous output to be safe
        page.keyboard.type("clear")
        page.keyboard.press("Enter")

        page.keyboard.type("status")
        page.keyboard.press("Enter")

        # Give it a moment to render
        time.sleep(1)

        logs = page.locator(".terminal-line").all_inner_texts()
        thread_found = False
        for log in logs:
            if "Thread Count: 1" in log:
                thread_found = True
                break

        if thread_found:
            print("SUCCESS: Thread woven successfully after simulation.")
        else:
            print("FAILED: Thread count did not increase.")
            print("Logs:", logs)
            sys.exit(1)

        browser.close()

if __name__ == "__main__":
    verify_chronos()
