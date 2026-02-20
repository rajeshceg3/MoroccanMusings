from playwright.sync_api import sync_playwright
import time

def verify(page):
    page.goto("http://localhost:8081")

    # Wait for app to init (bootstrap)
    page.wait_for_timeout(2000)

    # Trigger Panopticon UI
    # We can try to access window.panopticon
    # If not exposed, we might need to find another way, but let's assume it works based on bootstrap.js logic

    # Check if window.panopticon exists
    has_panopticon = page.evaluate("typeof window.panopticon !== 'undefined'")
    if not has_panopticon:
        print("Panopticon instance not found on window. Trying to trigger via console command?")
        # Maybe use the 'run' command from terminal? 'run panopticon'? No.
        # But let's hope it works.
        return

    # Force capture a snapshot first so there is data
    page.evaluate("window.panopticon.capture()")

    # Open UI
    page.evaluate("window.panopticon.toggleInterface(true)")

    # Wait for visibility
    page.wait_for_selector("#panopticon-interface", state="visible")

    # Wait a bit for animations
    page.wait_for_timeout(1000)

    # Take screenshot
    page.screenshot(path="verification/panopticon_ui.png")
    print("Screenshot saved to verification/panopticon_ui.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
