
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:8081")
        await page.wait_for_selector("#splash-screen")

        # Dismiss splash
        await page.keyboard.press("Enter")
        await asyncio.sleep(1)

        # Align rings to enter Riad (Serenity/Dawn)
        await page.focus("#ring-intention")
        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowLeft")
        await asyncio.sleep(0.5)

        await page.focus("#ring-time")
        await page.keyboard.press("ArrowRight")
        await page.keyboard.press("ArrowLeft")
        await asyncio.sleep(0.5)

        await page.click(".astrolabe-center")
        await asyncio.sleep(2)

        # Take screenshot of Riad screen
        await page.screenshot(path="verification/riad_screen.png")
        print("Screenshot taken: verification/riad_screen.png")

        # Test Image Error
        await page.evaluate("""
            const img = document.getElementById('riad-image-element');
            img.src = 'invalid-url.jpg';
        """)
        await asyncio.sleep(0.5)
        await page.screenshot(path="verification/riad_screen_error.png")
        print("Screenshot taken: verification/riad_screen_error.png")

        await browser.close()

asyncio.run(run())
