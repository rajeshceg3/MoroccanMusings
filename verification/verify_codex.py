import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

PORT = 8087 # Changed port

def run_server():
    # Serve from current directory (repo root)
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify():
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2) # Wait for server

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # 1. Load Page
            page.goto(f"http://localhost:{PORT}")

            # 2. Dismiss Splash
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active")

            # 3. Go to Tapestry
            page.click("#tapestry-icon")
            page.wait_for_selector("#tapestry-screen.active")

            # 4. Forge Shard (Expect Error because empty, but verifies async call)
            # We want to verify that the UI doesn't freeze and notification appears
            # Ideally we weave a thread first to allow forging

            # Weave a fake thread programmatically via console for speed
            page.evaluate("""
                tapestryLedger.addThread({
                    intention: 'serenity',
                    time: 'dawn',
                    region: 'coast',
                    title: 'Test Thread'
                }).then(() => {
                    mandalaRenderer.render(tapestryLedger.getThreads());
                });
            """)

            time.sleep(1)

            # Click Forge
            page.click("#forge-shard")

            # Take screenshot immediately to see if we catch the "wait" cursor or notification
            # Hard to catch transient states in screenshot but we can check notification text
            page.wait_for_selector(".toast", state="visible")

            # Capture
            page.screenshot(path="verification/codex_verification.png")

            print("Verification successful. Screenshot saved.")

    except Exception as e:
        print(f"Verification failed: {e}")
    finally:
        # Server thread dies with main process
        pass

if __name__ == "__main__":
    verify()
