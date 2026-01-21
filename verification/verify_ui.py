
from playwright.sync_api import sync_playwright

def verify_synapse_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:8080/index.html")
        page.wait_for_timeout(2000)

        # Splash screen blocking? Click body or press space
        page.keyboard.press("Space")
        page.wait_for_timeout(2000)

        # Handle Ghost Guide if present (overlay blocking clicks)
        guide_skip = page.query_selector("#guide-skip-btn")
        if guide_skip and guide_skip.is_visible():
            guide_skip.click()
            page.wait_for_timeout(1000)

        # Force hide splash if still active (debug)
        page.evaluate("document.getElementById('splash-screen').classList.remove('active')")
        page.wait_for_timeout(500)

        # Go to Tapestry
        page.click("#tapestry-icon")
        page.wait_for_selector("#tapestry-screen.active")

        # Check if Synapse button exists
        synapse_btn = page.query_selector("#synapse-toggle")
        if not synapse_btn:
            print("Synapse button not found")
            return

        # Click it
        synapse_btn.click()
        page.wait_for_timeout(1000) # Wait for animation/render

        # Take screenshot
        page.screenshot(path="verification/synapse_active.png")
        print("Screenshot saved to verification/synapse_active.png")

        browser.close()

if __name__ == "__main__":
    verify_synapse_ui()
