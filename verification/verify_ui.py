
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (running on port 8080)
        page.goto("http://localhost:8080")

        # 1. Verify Splash Screen
        # It should appear and then be dismissable
        # We wait for opacity to be 1 (visual entry)
        page.wait_for_selector(".tadelakt-surface", state="visible")

        # Take screenshot of splash
        page.screenshot(path="verification/splash.png")

        # Dismiss splash
        page.click("#splash-screen")

        # 2. Verify Astrolabe Screen (should be immediate)
        page.wait_for_selector("#astrolabe-screen.active", state="visible")
        page.screenshot(path="verification/astrolabe.png")

        # 3. Verify Accessibility Focus (Intention Ring)
        # Check if the ring has focus or we can focus it
        intention_ring = page.locator("#ring-intention")
        intention_ring.focus()
        page.screenshot(path="verification/astrolabe_focused.png")

        # 4. Verify Tapestry Screen
        page.click("#tapestry-icon")
        page.wait_for_selector("#tapestry-screen.active", state="visible")

        # Check Shadow DOM layer presence
        a11y_layer = page.locator("#tapestry-a11y-layer")
        if a11y_layer.count() > 0:
            print("Shadow DOM layer present.")

        page.screenshot(path="verification/tapestry.png")

        browser.close()

if __name__ == "__main__":
    verify_ui()
