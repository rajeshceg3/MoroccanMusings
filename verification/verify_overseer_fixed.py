
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True, args=['--disable-web-security'])
    page = browser.new_page()
    page.goto("http://localhost:8080")

    # Dismiss Splash
    page.click("#splash-screen")

    # Handle Guide
    try:
        page.wait_for_selector("#ghost-guide-overlay:not(.hidden)", state="visible", timeout=5000)
        page.click("#guide-skip-btn")
        page.wait_for_selector("#ghost-guide-overlay", state="hidden")
    except Exception as e:
        print("Guide not found or timeout:", e)

    page.wait_for_selector("#astrolabe-screen.active")

    # Open Terminal
    page.keyboard.press("Control+Space")
    page.wait_for_selector(".neural-link-overlay.active")

    # Deploy Unit (vanguard deploy TYPE REGION)
    page.keyboard.type("vanguard deploy INTERCEPTOR coast")
    page.keyboard.press("Enter")
    page.wait_for_timeout(1000)

    # Close Terminal
    page.keyboard.press("Control+Space")

    # Navigate to Tapestry
    page.evaluate("document.getElementById('tapestry-icon').click()")
    page.wait_for_selector("#tapestry-screen.active")

    # Wait for map render
    page.wait_for_timeout(2000)

    # Screenshot
    page.screenshot(path="verification_overseer_fixed.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
