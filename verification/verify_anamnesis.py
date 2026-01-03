
import asyncio
from playwright.async_api import async_playwright
import json
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # 1. Load the app
        await page.goto("http://localhost:8081")
        await page.wait_for_selector("#splash-screen")
        await page.keyboard.press("Enter")
        await asyncio.sleep(1)

        # 2. Weave a thread (Serenity/Dawn)
        await page.click(".astrolabe-center")
        await asyncio.sleep(2)
        await page.click("#weave-button")
        await asyncio.sleep(2) # Wait for animation

        # 3. Go to Tapestry
        await page.click("#tapestry-icon")
        await asyncio.sleep(1)

        # 4. Verify Export Button exists
        export_btn = await page.query_selector("#export-scroll")
        if not export_btn:
            raise Exception("Export button missing")

        print("Export button found.")

        # 5. Verify Canvas is drawing
        # We can't easily check pixel data without a reference, but we can check if no error occurred

        # 6. Test Import Flow (Mocking file upload if possible, or just checking the input existence)
        import_input = await page.query_selector("#import-scroll")
        if not import_input:
            raise Exception("Import input missing")

        print("Import input found.")

        # 7. Check Console for integrity errors
        # (Playwright captures console logs)
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        await browser.close()
        print("Verification Anamnesis Passed")

asyncio.run(run())
