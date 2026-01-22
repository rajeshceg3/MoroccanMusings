import time
import threading
import http.server
import socketserver
import os
import sys
from playwright.sync_api import sync_playwright

PORT = 8087

def run_server():
    os.chdir(os.getcwd())
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
            context = browser.new_context()

            # Disable Ghost Guide by pre-setting localStorage
            page = context.new_page()
            page.goto(f"http://localhost:{PORT}")
            page.evaluate("localStorage.setItem('marq_onboarded', 'true')")
            page.reload()

            # Dismiss Splash
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active")

            # 1. Capture Pulse Animation
            # Wait for it to start
            time.sleep(1)
            page.screenshot(path="verification/astrolabe_pulse.png")
            print("Captured pulse screenshot.")

            # 2. Capture Dragging State
            # Simulate mousedown on ring
            # Ring intention is the outer one
            ring = page.locator("#ring-intention")
            box = ring.bounding_box()
            # Click on the ring border (roughly radius)
            # Center is x + w/2, y + h/2.
            # Radius is w/2.
            # We want to click on the border, say top.
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            radius = box["width"] / 2

            # Move to top edge
            page.mouse.move(cx, box["y"] + 10)
            page.mouse.down()

            # Wait for CSS transition/class application
            time.sleep(0.5)

            # Verify class is applied
            is_dragging = page.evaluate("document.querySelector('#ring-intention').classList.contains('dragging')")
            print(f"Ring has 'dragging' class: {is_dragging}")

            page.screenshot(path="verification/dragging_ring.png")
            print("Captured dragging screenshot.")
            page.mouse.up()

            # 3. Capture Offline Toast
            context.set_offline(True)
            page.wait_for_selector(".toast-offline", state="visible")
            page.screenshot(path="verification/offline_toast.png")
            print("Captured offline toast screenshot.")

            context.set_offline(False)

            browser.close()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_visuals()
