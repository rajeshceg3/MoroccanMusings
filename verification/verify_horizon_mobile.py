from playwright.sync_api import sync_playwright
import os
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming server is running on port 8086 as per verify_app.py)
        # Note: If verify_app.py left the server running, we can use it.
        # But we should probably start our own or rely on previous tools.
        # Since I ran verify_app.py which starts a server in a thread but the script exited,
        # the server thread died with the script. I need to start a server.

        # Actually, let's start a server in the background using python first.
        # But for this script, let's assume we can serve the directory.

        # Wait, I cannot start a background process easily inside this python script without threading.
        # I will rely on 'run_in_bash_session' to start the server before running this.

        page.goto("http://localhost:8087")

        # 1. Verify Splash Screen
        splash = page.locator("#splash-screen")
        splash.click()

        # 2. Verify Astrolabe
        page.wait_for_selector("#astrolabe-screen.active")

        # 3. Verify Tapestry & Dashboard
        page.click("#tapestry-icon")
        page.wait_for_selector("#tapestry-screen.active")

        # Toggle Horizon
        page.click("#horizon-toggle")

        # Wait for dashboard
        dashboard = page.locator(".horizon-dashboard")
        dashboard.wait_for(state="visible")

        # Check if dashboard is visible
        if not dashboard.is_visible():
            raise Exception("Horizon Dashboard not visible")

        # Take screenshot of the dashboard in Horizon Mode
        # Emulate mobile to check responsiveness
        page.set_viewport_size({"width": 375, "height": 667})
        time.sleep(1) # wait for resize/css transition

        page.screenshot(path="verification/horizon_mobile.png")
        print("Screenshot saved to verification/horizon_mobile.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
