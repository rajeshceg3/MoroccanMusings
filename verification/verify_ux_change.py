
from playwright.sync_api import sync_playwright

def verify_ux(page):
    page.goto("http://localhost:8080")

    # 1. Verify Splash Screen
    splash = page.locator("#splash-screen")
    print(f"Splash screen visible: {splash.is_visible()}")

    # Click to dismiss splash
    page.click("body")
    page.wait_for_timeout(1000) # Wait for fade

    # 2. Verify Astrolabe (Focus)
    page.keyboard.press("Tab")
    focused = page.evaluate("document.activeElement.id")
    print(f"Focused element after Tab: {focused}")

    # 3. Navigate to Tapestry
    page.click("#tapestry-icon")
    page.wait_for_timeout(1000)

    # 4. Verify Loading Overlay (Simulated)
    # We trigger Forge but reject early if empty, but we want to see the overlay
    # Actually, let's just inspect the DOM to see if the overlay exists and has correct styles
    overlay = page.locator("#loading-overlay")
    print(f"Overlay exists in DOM: {overlay.count() > 0}")

    # 5. Check CSS for focus-visible
    # We can't easily check computed styles for pseudo-classes in simple scripts,
    # but we can check if the style tag is applied.

    # Take screenshot of Tapestry screen
    page.screenshot(path="verification/ux_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_ux(page)
        finally:
            browser.close()
