from playwright.sync_api import sync_playwright
import time

def verify_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
        page = browser.new_page()

        # Navigate
        page.goto("http://localhost:8080")

        # 1. Splash Screen interaction
        page.click("#splash-screen")

        # Wait for Astrolabe screen
        page.wait_for_selector("#astrolabe-screen.active")
        time.sleep(1)

        # Close the Ghost Guide if open
        if page.is_visible("#ghost-guide-overlay"):
            page.click("#guide-skip-btn")
            time.sleep(0.5) # Wait for fade out

        # 2. Verify Ghost Guide Trigger (#help-trigger)
        help_btn = page.locator("#help-trigger")

        # 3. Simulate Dragging State on Ring
        # Force the class
        page.evaluate("document.querySelector('#ring-intention').classList.add('dragging')")

        # 4. Take Screenshot
        page.screenshot(path="verification/ux_verification_clean.png")

        browser.close()

if __name__ == "__main__":
    verify_ux()
