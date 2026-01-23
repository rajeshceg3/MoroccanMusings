from playwright.sync_api import sync_playwright
import time

def verify_gemini_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-web-security"])
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Wait for splash to clear or manually dismiss
        time.sleep(1)
        page.keyboard.press("Enter")
        time.sleep(2)

        # Check for Uplink Controls
        page.wait_for_selector(".uplink-controls")

        # Screenshot
        page.screenshot(path="verification/gemini_ui.png")
        browser.close()

if __name__ == "__main__":
    verify_gemini_ui()
