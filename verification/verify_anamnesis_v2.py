
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Load the app (using fresh port 8090)
        await page.goto("http://localhost:8090")
        await page.wait_for_selector("#splash-screen")
        await page.keyboard.press("Enter")
        await asyncio.sleep(1)

        # 2. Weave a thread (Serenity/Dawn)
        # Just click center, assuming default alignment
        await page.click(".astrolabe-center")
        await asyncio.sleep(2)

        # Try to weave if button is visible
        try:
            # wait for button visible
            await page.wait_for_selector(".weave-button.visible", timeout=5000)
            await page.click(".weave-button")
            await asyncio.sleep(2) # wait for animation
        except:
            print("Skipping weave (button not ready)")

        # 3. Go to Tapestry
        # Sometimes tapestry icon is on astrolabe screen. If we are in Riad screen, we need to go back or use dev shortcut.
        # But weave animation should return us to astrolabe?
        # Wait, app.js says:
        # weaveThread -> animation -> remove -> icon pulse -> state.isWeaving = false
        # It DOES NOT automatically go back to Astrolabe?
        # Oh, the user has to click Back.

        # Let's check where we are.
        # If weave happened, we are still on Riad screen?
        # "thread.remove(); elements.astrolabe.tapestryIcon.classList.add..."
        # It adds class to icon, but doesn't change screen.

        # So we need to click Back on Riad screen to get to Astrolabe
        try:
            await page.click("#back-button")
            await asyncio.sleep(1)
        except:
            pass

        await page.click("#tapestry-icon")
        await asyncio.sleep(1)

        # 4. Take screenshot
        await page.screenshot(path="verification/anamnesis_proof.png")
        print("Screenshot taken: verification/anamnesis_proof.png")

        await browser.close()

asyncio.run(run())
