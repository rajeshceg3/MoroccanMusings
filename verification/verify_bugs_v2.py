
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

        # We need to simulate the state where we can enter the Riad screen.
        # The logic in app.js requires `state.intention` and `state.time` to be set.
        # We can simulate the state update by calling the updateSelection logic via evaluating code
        # BUT we can't access `state` directly easily.
        # However, we can use the `click` on center logic which checks `state`.
        # To fix the "Failed to enter Riad screen" in verification, we should mock the state or force entry.

        # Let's try to align rings by executing the logic that happens on snap.
        # Since we can't access `updateSelection` (it's inside closure), we have to use the UI.
        # Maybe the keyboard wiggle in previous script wasn't enough?
        # The rings need to be at specific rotation.
        # Serenity is at index 0 (0 deg). Dawn is at index 0 (0 deg).
        # Initially `currentRotation` is 0 in `setupRing`.
        # But `state.intention` is null.
        # We need to trigger `onSnap`.
        # `keydown` triggers `onSnap`.
        # So we focus ring-intention and press Right then Left.

        # Reload to be fresh
        await page.goto("http://localhost:8081")
        await page.keyboard.press("Enter") # Dismiss splash
        await asyncio.sleep(1)

        # Focus intention ring
        await page.focus("#ring-intention")
        await page.keyboard.press("ArrowRight") # -90
        await page.keyboard.press("ArrowLeft")  # +90 -> 0
        await asyncio.sleep(0.5)

        # Focus time ring
        await page.focus("#ring-time")
        await page.keyboard.press("ArrowRight") # -90
        await page.keyboard.press("ArrowLeft")  # +90 -> 0
        await asyncio.sleep(0.5)

        # Now click center
        await page.click(".astrolabe-center")
        await asyncio.sleep(2)

        # Check if we are on Riad screen
        riad_class = await page.eval_on_selector("#riad-screen", "el => el.className")

        if "active" in riad_class:
            print("Entered Riad Screen.")

            # Wait for weave button
            await asyncio.sleep(2) # Button has 1.5s delay

            # Test Click
            print("Testing Weave Button Click...")

            # Get initial thread count
            initial_threads = await page.evaluate("document.querySelectorAll('.thread-animation').length")

            await page.click("#weave-button")
            await asyncio.sleep(0.5)
            threads = await page.evaluate("document.querySelectorAll('.thread-animation').length")
            if threads > initial_threads:
                print("PASS: Weave button worked on click.")
            else:
                # Maybe the thread animation is very fast or invisible?
                # Check isWeaving state? Can't access.
                # Check if tapesty icon pulsed?
                pulse = await page.eval_on_selector("#tapestry-icon", "el => el.classList.contains('tapestry-icon-pulse')")
                if pulse:
                     print("PASS: Weave button worked (Icon pulsed).")
                else:
                     print("FAIL: Weave button did not work on click.")

            # Test Image Error Handling
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
                if "px" in margin_top:
                    val = float(margin_top.replace("px", ""))
                    if val > 100:
                        print("FAIL: Content is still pushed down by 100vh.")
                    else:
                        print("PASS: Content moved up.")
            else:
                print("FAIL: Image container not hidden on error.")

        else:
            print("Failed to enter Riad screen. (Still stuck on Astrolabe)")
            center_text = await page.text_content(".center-text")
            print(f"Center Text: {center_text}")

        await browser.close()

asyncio.run(run())
