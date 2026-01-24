from playwright.sync_api import sync_playwright
import sys
import os

def verify_ux():
    print("Starting UX Verification Protocol...")

    with sync_playwright() as p:
        # Launch browser with security disabled to allow local file access/manipulation if needed
        # and to bypass strict CSP during testing if necessary (though we want to test with it)
        browser = p.chromium.launch(args=["--disable-web-security"])
        page = browser.new_page()

        # Navigate to local server
        page.goto("http://localhost:8080")
        print("Navigated to target.")

        # Wait for Astrolabe to be visible
        page.wait_for_selector(".astrolabe-ring")

        # 1. Verify Astrolabe Drag State
        print("Verifying Astrolabe Drag State...")
        # Simulate drag: Mouse down on ring
        ring = page.locator(".astrolabe-ring")
        box = ring.bounding_box()
        page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
        page.mouse.down()

        # Take screenshot of dragging state
        screenshot_path = "verification/ring_drag.png"
        page.screenshot(path=screenshot_path)
        print(f"Captured drag state artifact: {screenshot_path}")

        page.mouse.up()

        # 2. Verify Help Button Hover
        print("Verifying Ghost Guide Trigger...")
        help_btn = page.locator("#help-trigger")
        help_btn.hover()

        # Take screenshot of hover state
        screenshot_path_btn = "verification/help_btn_hover.png"
        page.screenshot(path=screenshot_path_btn)
        print(f"Captured hover state artifact: {screenshot_path_btn}")

        browser.close()
        print("UX Verification Protocol Complete.")

if __name__ == "__main__":
    verify_ux()
