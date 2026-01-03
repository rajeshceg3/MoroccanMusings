
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Test Splash Screen Keyboard Accessibility
        print("Testing Splash Screen Accessibility...")
        await page.goto("http://localhost:8081")
        await page.wait_for_selector("#splash-screen")

        # Try to press Enter to dismiss splash screen
        await page.keyboard.press("Enter")
        await asyncio.sleep(1) # Wait for potential transition

        # Check if splash screen is still active or if we moved to astrolabe
        splash_class = await page.eval_on_selector("#splash-screen", "el => el.className")
        if "active" in splash_class:
            print("FAIL: Splash screen did not dismiss with Enter key.")
        else:
            print("PASS: Splash screen dismissed with Enter key.")

        # Manually click to proceed if failed (so we can test other things)
        if "active" in splash_class:
            await page.click("#splash-screen")
            await asyncio.sleep(2)

        # 2. Test Weave Button UX (Click vs Hold)
        print("\nTesting Weave Button UX...")
        # Navigate to a Riad screen (simulated by clicking center)
        # First align rings? The code says "Align the rings" text is there.
        # But we can cheat and set state via JS or just click center if it allows default?
        # Code: `if (state.intention && state.time) ...` so we must align rings first.
        # Let's interact with rings via JS to be fast.

        await page.evaluate("""
            const intention = document.getElementById('ring-intention');
            const time = document.getElementById('ring-time');
            // Align intention to Serenity (0 deg)
            intention.style.transform = 'rotate(0deg)';
            // Align time to Dawn (0 deg)
            time.style.transform = 'rotate(0deg)';
            // Trigger update? The update logic is inside closures in app.js.
            // We might need to simulate the drag events or keyboard events.
        """)

        # Let's use keyboard to rotate rings
        # Focus intention ring
        await page.focus("#ring-intention")
        # Rotate to serenity (0 is default start? No, startAngle is 0.
        # setupRing: currentRotation starts at 0. keys add +/- 90.
        # Intention 0 = Serenity. Time 0 = Dawn.
        # So initially they should be aligned?
        # Let's check center text.
        center_text = await page.text_content(".center-text")
        print(f"Initial Center Text: {center_text}")

        if "Align the rings" in center_text:
             # Maybe we need to trigger an update manually or move them
             # Actually, code says: `setupRing(..., (angle) => updateSelection(...))`
             # But `currentRotation` is local to `setupRing`.
             # If we use keyboard, it updates.
             await page.keyboard.press("ArrowRight") # -90
             await page.keyboard.press("ArrowLeft")  # +90 -> back to 0
             # Trigger update
             await asyncio.sleep(0.5)
             center_text = await page.text_content(".center-text")
             print(f"Center Text after wiggle: {center_text}")

        # If aligned, click center
        await page.click(".astrolabe-center")
        await asyncio.sleep(2)

        # Check if we are on Riad screen
        riad_class = await page.eval_on_selector("#riad-screen", "el => el.className")
        if "active" in riad_class:
            print("Entered Riad Screen.")

            # Wait for weave button
            await asyncio.sleep(2) # Button has 1.5s delay

            # Test Click
            print("Testing Weave Button Click (Expect Failure)...")
            # We need to know if weaving happened.
            # We can check `state.isWeaving` but it's private.
            # We can check if `tapestryService.getThreads()` increased.
            # Or check for `.thread-animation` element.

            await page.click("#weave-button")
            await asyncio.sleep(0.5)
            threads = await page.evaluate("document.querySelectorAll('.thread-animation').length")
            if threads > 0:
                print("PASS: Weave button worked on click.")
            else:
                print("FAIL: Weave button did not work on click (Expected).")

        else:
            print("Failed to enter Riad screen.")

        # 3. Test Image Error Handling
        print("\nTesting Image Error Handling...")
        # Force an image error by changing src
        await page.evaluate("""
            const img = document.getElementById('riad-image-element');
            img.src = 'invalid-url.jpg';
        """)
        await asyncio.sleep(0.5)

        # Check if container is hidden
        display = await page.eval_on_selector("#riad-image-container", "el => el.style.display")
        if display == "none":
            print("Image container hidden on error.")
            # Check content margin
            margin_top = await page.eval_on_selector(".riad-content", "el => getComputedStyle(el).marginTop")
            print(f"Content Margin Top: {margin_top}")
            # 100vh is usually around 600-800px or more.
            if "px" in margin_top:
                val = float(margin_top.replace("px", ""))
                if val > 100:
                    print("FAIL: Content is still pushed down by 100vh.")
                else:
                    print("PASS: Content moved up.")
        else:
            print("FAIL: Image container not hidden on error.")

        # 4. Check CSP errors
        print("\nChecking for CSP Errors...")
        # We can't easily capture console logs with this simple script without event listener
        # But we can suspect the thread animation if we managed to trigger it.
        # Since click failed, we can't test it easily unless we simulate long press.

        # Simulate Long Press
        print("Testing Weave Button Long Press...")
        await page.dispatch_event("#weave-button", "mousedown")
        await asyncio.sleep(1.1)
        await page.dispatch_event("#weave-button", "mouseup")

        threads = await page.evaluate("document.querySelectorAll('.thread-animation').length")
        if threads > 0:
             print("PASS: Weave button worked on long press.")
        else:
             print("FAIL: Weave button did not work on long press.")

        await browser.close()

asyncio.run(run())
