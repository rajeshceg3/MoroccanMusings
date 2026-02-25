from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Go to the app
    page.goto("http://localhost:8080")

    # Click the Settings button (gear icon)
    # id="settings-trigger"
    try:
        page.wait_for_selector("#settings-trigger", timeout=5000)
        page.click("#settings-trigger")

        # Wait for the settings overlay to appear
        # id="settings-overlay"
        page.wait_for_selector("#settings-overlay:not(.hidden)", timeout=5000)

        # Verify the Reset button exists
        # text="RESET OPERATIONAL GUIDE"
        reset_btn = page.get_by_role("button", name="RESET OPERATIONAL GUIDE")
        if reset_btn.is_visible():
            print("SUCCESS: Reset button found.")
        else:
            print("FAILURE: Reset button not found.")

        # Take screenshot
        page.screenshot(path="verification/settings_reset_btn.png")
    except Exception as e:
        print(f"ERROR: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
