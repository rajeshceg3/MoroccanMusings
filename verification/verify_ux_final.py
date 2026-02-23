import sys
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        try:
            page.goto("http://localhost:4173")
            page.wait_for_selector("#splash-screen")
            page.click("body")
            time.sleep(2)

            settings = page.locator("#settings-trigger")
            signal = page.locator("#signal-trigger")

            settings_right_css = settings.evaluate("el => getComputedStyle(el).right")
            signal_right_css = signal.evaluate("el => getComputedStyle(el).right")

            s_r = float(settings_right_css.replace('px', ''))
            sig_r = float(signal_right_css.replace('px', ''))
            diff = abs(sig_r - s_r)

            print(f"Gap: {diff}px")
            page.screenshot(path="verification/ux_fixed.png")

            if diff >= 60:
                 print("SUCCESS")
            else:
                 sys.exit(1)

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
