from playwright.sync_api import sync_playwright

def verify_buttons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        # Bypass onboarding
        context.add_init_script("localStorage.setItem('marq_onboarded', 'true');")
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8080/")

        # Click Splash to enter
        print("Dismissing Splash...")
        page.click("#splash-screen")

        # Wait for Astrolabe
        print("Waiting for Astrolabe...")
        page.wait_for_selector("#astrolabe-screen.active", state="visible")

        # Verify Tapestry Icon is a button
        print("Verifying Tapestry Icon...")
        tapestry_icon = page.locator("#tapestry-icon")
        tag_name = tapestry_icon.evaluate("el => el.tagName")
        print(f"Tapestry Icon Tag: {tag_name}")

        if tag_name != "BUTTON":
            print("FAILURE: #tapestry-icon is not a BUTTON")
            exit(1)

        # Verify Back Button logic (it exists in DOM even if hidden/visible?)
        # #tapestry-back is in #tapestry-screen.
        # Let's go to Tapestry screen.
        print("Clicking Tapestry Icon...")
        tapestry_icon.click()

        print("Waiting for Tapestry...")
        page.wait_for_selector("#tapestry-screen.active", state="visible")

        print("Verifying Back Button...")
        back_btn = page.locator("#tapestry-back")
        tag_name_back = back_btn.evaluate("el => el.tagName")
        print(f"Back Button Tag: {tag_name_back}")

        if tag_name_back != "BUTTON":
            print("FAILURE: #tapestry-back is not a BUTTON")
            exit(1)

        # Screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/buttons_verified.png")
        print("Verification Complete.")

        browser.close()

if __name__ == "__main__":
    verify_buttons()
