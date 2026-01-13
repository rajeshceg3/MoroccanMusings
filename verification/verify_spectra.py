from playwright.sync_api import sync_playwright

def verify_spectra(page):
    page.goto("http://localhost:8080")
    page.click("body")  # Dismiss Splash
    page.wait_for_selector("#astrolabe-screen.active")

    # Open Terminal
    page.keyboard.press("Control+Space")
    page.wait_for_selector(".neural-link-overlay.active")

    # Wait for the "Type help" message which is class .line-info or just .terminal-line
    page.wait_for_selector(".terminal-line")

    # Type signal command
    page.keyboard.type("signal analyze")
    page.keyboard.press("Enter")

    # Wait for output - check for any new line
    page.wait_for_timeout(1000)

    # Take screenshot of terminal output
    page.screenshot(path="verification/spectra_terminal.png")
    print("Screenshot taken: verification/spectra_terminal.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    verify_spectra(page)
    browser.close()
