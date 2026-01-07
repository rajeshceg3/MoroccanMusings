from playwright.sync_api import sync_playwright

def verify_ux_hardening():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:8080")

        # 1. Skip Splash
        page.keyboard.press("Enter")
        page.wait_for_selector("#astrolabe-screen.active")
        print("Passed Splash Screen")

        # 2. Go to Tapestry
        page.click("#tapestry-icon")
        page.wait_for_selector("#tapestry-screen.active")
        print("Entered Tapestry")

        # 3. Import Scroll (Simulated for data)
        # We need data to test accessibility threads.
        # We'll use JS to inject threads directly via console/evaluate since we don't have a file handy easily
        # or we can create a dummy json.

        page.evaluate("""
            window.tapestryLedger.addThread({
                intention: 'serenity',
                time: 'dawn',
                region: 'coast',
                title: 'Test Thread Alpha'
            });
            window.tapestryLedger.addThread({
                intention: 'vibrancy',
                time: 'dusk',
                region: 'medina',
                title: 'Test Thread Beta'
            });
        """)
        # Force render
        page.evaluate("window.mandalaRenderer.render(window.tapestryLedger.getThreads())")
        print("Injected Test Threads")

        # 4. Verify Shadow DOM presence
        shadow_container = page.query_selector("#tapestry-a11y-layer")
        if shadow_container:
            print("Shadow DOM Container Found")
        else:
            print("FAIL: Shadow DOM Container Missing")

        buttons = page.query_selector_all("#tapestry-a11y-layer button")
        print(f"Found {len(buttons)} accessible thread buttons")

        if len(buttons) != 2:
            print("FAIL: Expected 2 buttons")

        # 5. Test Click on Button 1
        buttons[0].click()
        # Verify selection state in State
        selected_count = page.evaluate("window.state.selectedThreads.length")
        print(f"Selected Threads: {selected_count}")

        # Screenshot Tapestry with selection
        page.screenshot(path="verification/tapestry_ux.png")

        # 6. Test Notification System
        page.evaluate("window.showNotification('Test Notification', 'success')")
        page.wait_for_timeout(500) # Wait for animation
        page.screenshot(path="verification/notification_ux.png")

        browser.close()

if __name__ == "__main__":
    verify_ux_hardening()
