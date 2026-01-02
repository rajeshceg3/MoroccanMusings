import sys
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console logs to debug if needed
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER UNCAUGHT ERROR: {exc}"))

        try:
            print("Navigating to http://localhost:8081/index.html")
            page.goto("http://localhost:8081/index.html")

            print("Checking Splash...")
            splash = page.wait_for_selector("#splash-screen.active", timeout=5000)
            if not splash:
                print("Splash screen not found.")
                return False
            print("Splash visible.")

            print("Clicking Splash...")
            page.click("#splash-screen")

            print("Waiting for Astrolabe...")
            astrolabe = page.wait_for_selector("#astrolabe-screen.active", timeout=5000)

            if astrolabe:
                print("Astrolabe screen active. Transition successful.")
                # Wait a brief moment for any CSS transitions to settle
                page.wait_for_timeout(1000)
                screenshot_path = "verification/astrolabe_success.png"
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to {screenshot_path}")
                return True
            else:
                print("Astrolabe screen did not become active.")
                return False

        except Exception as e:
            print(f"Astrolabe check failed: {e}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    success = verify()
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
