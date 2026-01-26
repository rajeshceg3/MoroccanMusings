from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        # Disable web security to allow local file access if needed or bypass strict CSP for testing tools
        browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
        page = browser.new_page()

        print("Navigating...")
        page.goto("http://localhost:8080")

        print("Waiting for Panopticon...")
        # Wait for the app to initialize and expose the global
        try:
            page.wait_for_function("() => window.panopticon !== undefined", timeout=10000)
        except:
            print("Panopticon object not found on window.")
            page.screenshot(path="verification_timeout.png")
            browser.close()
            return

        print("Toggling Interface...")
        # Open the interface via the exposed API
        page.evaluate("window.panopticon.toggleInterface(true)")

        # Wait for the transition
        page.wait_for_timeout(1000)

        # Locate the overlay
        overlay = page.locator("#panopticon-interface")

        if overlay.is_visible():
             print("Overlay is visible. Capturing...")
             # Capture the specific element
             overlay.screenshot(path="verification_panopticon.png")
             # Also capture full page context
             page.screenshot(path="verification_full.png")
             print("Screenshots taken.")
        else:
             print("Overlay not visible.")
             page.screenshot(path="verification_fail.png")

        browser.close()

if __name__ == "__main__":
    run()
