from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:4173")

    # Click splash screen to dismiss
    page.click('#splash-screen')

    # Wait for astrolabe
    page.wait_for_selector('#astrolabe-screen.active')

    # Click Settings Gear
    page.click('#settings-trigger')

    # Wait for settings overlay
    page.wait_for_selector('#settings-overlay:not(.hidden)')

    # Screenshot Settings Modal
    page.screenshot(path="verification/settings_modal.png")

    # Toggle High Contrast
    page.click('label[for="setting-contrast"]')

    # Wait a bit for transition (though disabled in code, good practice)
    page.wait_for_timeout(500)

    # Verify class added
    body_class = page.eval_on_selector('body', 'el => el.className')
    print(f"Body class: {body_class}")

    # Screenshot High Contrast
    page.screenshot(path="verification/high_contrast.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
