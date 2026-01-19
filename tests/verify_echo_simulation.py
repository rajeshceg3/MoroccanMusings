import sys
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # URL
        url = "http://localhost:8081/tests/echo_test.html"

        print(f"Loading {url}...")

        # Capture console logs
        messages = []
        page.on("console", lambda msg: messages.append(msg.text))

        try:
            page.goto(url)
            page.wait_for_timeout(3000) # Wait for tests to run (audio stuff can be slow)

            # Check results
            passed = False
            for m in messages:
                print(f"CONSOLE: {m}")
                if "Real-Time Logic: PASSED" in m:
                    passed = True

            if passed:
                print("VERIFICATION SUCCESSFUL")
                sys.exit(0)
            else:
                print("VERIFICATION FAILED")
                sys.exit(1)

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
