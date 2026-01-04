
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Load the page
        print("Loading page...")
        await page.goto("http://localhost:8081")

        # Verify Splash Screen
        splash = page.locator("#splash-screen")
        await expect(splash).to_be_visible()

        # Wait for text to appear (opacity transition)
        await page.wait_for_timeout(2500)

        # Click to dismiss
        print("Dismissing splash...")
        await splash.click()

        # Verify Astrolabe Screen
        astrolabe = page.locator("#astrolabe-screen")
        await expect(astrolabe).to_be_visible()
        print("Astrolabe screen visible.")

        # Screenshot 1: Astrolabe
        await page.screenshot(path="verification/screenshot_astrolabe.png")

        # 2. Check Astrolabe Interactions
        center_text = page.locator(".center-text")

        # Verify Ring Rotation Logic (ArrowRight should be Next)
        intention_ring = page.locator("#ring-intention")
        await intention_ring.focus()
        # Rotate Right -> Should pick Index 1 (Vibrancy)
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(1000)

        # Rotate Time Ring Right -> Should pick Index 1 (Midday)
        time_ring = page.locator("#ring-time")
        await time_ring.focus()
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(1000)

        text = await center_text.text_content()
        print(f"Updated Center Text: {text}")

        if "vibrancy" in text and "midday" in text:
             print("SUCCESS: ArrowRight correctly selected next items.")
        else:
             print(f"FAILURE: Expected vibrancy/midday, got {text}")

        # 3. Check Fallback Logic (Intention Legacy, Time Night - Missing)
        # Reset to Serenity/Dawn first? No, let's just go to Legacy/Night
        # From Vibrancy (Index 1).
        # To Legacy (Index 3). Need 2 more Rights.
        await intention_ring.focus()
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(600)
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(600)

        # To Night (Index 3). Need 2 more Rights.
        await time_ring.focus()
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(600)
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(600)

        text = await center_text.text_content()
        print(f"Testing Fallback for: {text}")

        # Click Center
        center_btn = page.locator(".astrolabe-center")
        await center_btn.click()

        riad = page.locator("#riad-screen")
        try:
            await expect(riad).to_be_visible(timeout=3000)
            print("SUCCESS: Riad screen loaded despite missing specific path (Fallback worked).")
            # Screenshot 2: Riad
            await page.screenshot(path="verification/screenshot_riad_fallback.png")
        except:
            print("FAILURE: Riad screen did not load for missing path.")

        # 4. Check Tapestry Icon Accessibility
        # Go back first
        back_btn = page.locator("#back-button")
        await back_btn.click()
        await expect(astrolabe).to_be_visible()

        tapestry_icon = page.locator("#tapestry-icon")

        # Check Z-Index via evaluation
        z_index = await tapestry_icon.evaluate("el => getComputedStyle(el).zIndex")
        print(f"Tapestry Icon Z-Index: {z_index}")

        # Click it
        await tapestry_icon.click()
        tapestry = page.locator("#tapestry-screen")
        await expect(tapestry).to_be_visible()
        print("SUCCESS: Tapestry screen accessible.")

        # Screenshot 3: Tapestry
        await page.screenshot(path="verification/screenshot_tapestry.png")

        await browser.close()

asyncio.run(run())
