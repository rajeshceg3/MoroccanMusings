from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Disable Ghost Guide
    context = browser.new_context(viewport={'width': 375, 'height': 812}) # Mobile viewport
    context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")
    page = context.new_page()

    try:
        page.goto("http://localhost:8088/index.html")

        # Wait for splash
        page.wait_for_selector("#splash-screen.active", timeout=5000)
        # Click splash to proceed to Astrolabe (splash controller handles click)
        page.click("#splash-screen")

        page.wait_for_selector("#astrolabe-screen.active", timeout=10000)

        # Verify Signal Trigger on Astrolabe screen
        signal_btn = page.locator("#signal-trigger")
        if signal_btn.is_visible():
            print("Signal Trigger is visible.")
        else:
            print("Signal Trigger is NOT visible.")

        # Check styles for signal trigger
        # color: var(--ochre-gold) -> #c67605 -> rgb(198, 118, 5)
        color = signal_btn.evaluate("element => getComputedStyle(element).color")
        right = signal_btn.evaluate("element => getComputedStyle(element).right")
        print(f"Signal Trigger Color: {color}")
        print(f"Signal Trigger Right: {right}")

        # Navigate to Tapestry
        page.click("#tapestry-icon")
        page.wait_for_selector("#tapestry-screen.active")

        # Open Horizon Dashboard
        page.click("#horizon-toggle")
        # Wait for visibility class
        page.wait_for_selector("#horizon-dashboard.visible", state="visible")

        # Check if Horizon covers width on mobile
        horizon_width = page.evaluate("document.getElementById('horizon-dashboard').getBoundingClientRect().width")
        viewport_width = page.viewport_size['width']
        print(f"Horizon Width: {horizon_width}, Viewport: {viewport_width}")

        page.screenshot(path="verification/mobile_horizon.png")

        # Open Aegis HUD (should close Horizon)
        page.click("#aegis-toggle")
        # Wait for Aegis visibility
        page.wait_for_selector("#aegis-hud.visible", state="visible")

        # Verify Horizon is NOT visible
        # Check if class 'visible' is removed
        is_horizon_visible = page.evaluate("document.getElementById('horizon-dashboard').classList.contains('visible')")
        print(f"Is Horizon Visible after opening Aegis? {is_horizon_visible}")

        # Check Aegis width
        aegis_width = page.evaluate("document.getElementById('aegis-hud').getBoundingClientRect().width")
        print(f"Aegis Width: {aegis_width}")

        page.screenshot(path="verification/mobile_aegis.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
