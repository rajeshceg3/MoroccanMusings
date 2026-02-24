from playwright.sync_api import sync_playwright
import time

def verify_mandala(page):
    # Navigate to the app
    page.goto("http://localhost:8080")

    # Wait for splash transition (auto-dismiss ~3.5s)
    page.wait_for_timeout(4000)

    # Check for Ghost Guide and dismiss
    skip_btn = page.locator("#guide-skip-btn")
    if skip_btn.is_visible():
        print("Dismissing Ghost Guide...")
        skip_btn.click()
        page.wait_for_timeout(500) # Wait for fade out

    # Click the Tapestry icon.
    print("Navigating to Tapestry...")
    page.click("#tapestry-icon")

    # Wait for Tapestry screen
    page.wait_for_selector("#tapestry-screen.active")
    page.wait_for_timeout(1000) # Wait for canvas render

    # Check if canvas exists
    canvas = page.locator("#tapestry-canvas")
    if not canvas.is_visible():
        raise Exception("Tapestry Canvas not visible!")

    # Take screenshot
    page.screenshot(path="verification/verification_mandala.png")
    print("Screenshot taken: verification/verification_mandala.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_mandala(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
