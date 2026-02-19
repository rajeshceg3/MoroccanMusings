
from playwright.sync_api import sync_playwright

def verify_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        print("Navigating to app...")
        page.goto("http://localhost:5173")

        # Splash Screen
        print("Waiting for splash...")
        page.wait_for_selector("#splash-screen")
        page.wait_for_timeout(1000)
        page.click("body", force=True)

        # Wait for Astrolabe
        print("Waiting for Astrolabe...")
        page.wait_for_selector("#astrolabe-screen.active", timeout=5000)
        page.wait_for_timeout(1000)

        # 2. Verify Tapestry Buttons (UX Check)
        print("Navigating to Tapestry...")
        page.evaluate("document.getElementById('tapestry-icon').click()")
        page.wait_for_selector("#tapestry-screen.active")
        page.wait_for_timeout(1000)

        # Focus on a button to check ring
        print("Focusing on button...")
        # Force focus via JS to ensure ring appears
        page.evaluate("document.getElementById('horizon-toggle').focus()")

        # Take Screenshot of Buttons
        # Clip to the bottom area
        element = page.locator(".tapestry-actions")
        element.screenshot(path="verification/tapestry_buttons.png")
        print("Captured tapestry_buttons.png")

        browser.close()

if __name__ == "__main__":
    verify_ux()
