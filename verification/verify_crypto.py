from playwright.sync_api import sync_playwright

def verify_encryption_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Debug console
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        print("Navigating to app...")
        page.goto("http://localhost:8089", wait_until="networkidle")

        # 1. Wait for Splash
        print("Waiting for splash...")
        page.wait_for_selector("#splash-screen.active", state="visible")

        # 2. Dismiss Splash
        print("Dismissing splash...")
        page.keyboard.press("Space")

        # 3. Verify Unlocked
        print("Checking unlocked state...")
        page.wait_for_selector("#astrolabe-screen.active", state="visible")
        page.screenshot(path="verification/1_unlocked.png")
        print("Unlocked state verified.")

        # 4. Encrypt
        print("Encrypting system...")
        page.keyboard.press("Control+Space")
        page.wait_for_selector("#terminal-container.active", state="visible")
        page.type("#terminal-input", "sys-encrypt hunter2")
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)

        # 5. Lock
        print("Locking system...")
        page.type("#terminal-input", "sys-lock")

        print("Waiting for reload...")
        with page.expect_navigation():
            page.keyboard.press("Enter")

        # 6. Verify Locked State
        print("Checking locked state...")
        page.wait_for_selector("#splash-screen.active", state="visible")
        text = page.inner_text(".calligraphy")
        print(f"Splash Text: {text}")
        if "SECURE ENCLAVE" not in text:
             raise Exception(f"Expected 'SECURE ENCLAVE', found '{text}'")

        page.screenshot(path="verification/2_locked.png")
        print("Locked state verified.")

        # 7. Try to dismiss (Should fail/Show terminal)
        print("Attempting to dismiss locked splash...")
        page.keyboard.press("Space")
        page.wait_for_timeout(1000)

        # Terminal should be active
        if not page.is_visible("#terminal-container.active"):
             print("Terminal did not open automatically. Opening manually...")
             page.keyboard.press("Control+Space")

        # 8. Unlock
        print("Unlocking system...")
        page.wait_for_selector("#terminal-input", state="visible")
        page.type("#terminal-input", "auth hunter2")
        page.keyboard.press("Enter")

        # 9. Verify Re-entry
        print("Waiting for unlock UI update...")
        # Wait for text to revert (it should NOT contain SECURE ENCLAVE)
        page.wait_for_function("!document.querySelector('.calligraphy').textContent.includes('SECURE ENCLAVE')")

        print("Dismissing unlocked splash...")
        page.keyboard.press("Space")
        page.wait_for_selector("#astrolabe-screen.active", state="visible")

        print("Verified: System unlocked.")
        page.screenshot(path="verification/3_reunlocked.png")

        browser.close()

if __name__ == "__main__":
    verify_encryption_flow()
