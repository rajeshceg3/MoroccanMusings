from playwright.sync_api import sync_playwright
import time

def verify_panopticon():
    # Launch with security disabled to allow Playwright's evaluate to bypass strict CSP
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"]
        )
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        print("Navigating...")
        page.goto("http://localhost:8087")

        print("Waiting for App State...")
        # Now evaluate should work
        page.wait_for_function("typeof window.state !== 'undefined'", timeout=5000)

        # Bypass splash
        print("Bypassing Splash...")
        page.click("#splash-screen")
        page.wait_for_selector("#astrolabe-screen.active")

        # Weave threads via JS
        print("Weaving Threads...")
        page.evaluate("""
            (async () => {
                await window.tapestryLedger.addThread({ intention: 'serenity', region: 'coast', time: 'dawn', title: 'Thread 1' });
                if (window.panopticon) window.panopticon.capture();
                await window.tapestryLedger.addThread({ intention: 'vibrancy', region: 'medina', time: 'dusk', title: 'Thread 2' });
                if (window.panopticon) window.panopticon.capture();
            })()
        """)

        # Open Interface
        print("Opening Interface...")
        page.evaluate("window.panopticon.toggleInterface(true)")

        # Wait for UI
        page.wait_for_selector("#panopticon-interface:not(.hidden)")

        # Scrub timeline (Change slider value)
        print("Scrubbing Timeline...")
        page.fill("#panopticon-scrubber", "0")
        page.dispatch_event("#panopticon-scrubber", "input")

        # Verify text content update
        time.sleep(0.5) # Allow render
        status = page.text_content("#panopticon-status")
        print(f"Status: {status}")

        if "REPLAY" in status:
            print("SUCCESS: Entered Replay Mode.")
        else:
            print("FAILURE: Did not enter Replay Mode.")

        # Take Screenshot
        page.screenshot(path="verification/panopticon_replay.png")
        print("Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_panopticon()
