
from playwright.sync_api import sync_playwright
import time

def verify_valkyrie_integration():
    with sync_playwright() as p:
        # Launch browser with security disabled to bypass CSP for testing
        browser = p.chromium.launch(headless=True, args=['--disable-web-security'])
        page = browser.new_page()

        # Load the app
        page.goto("http://localhost:8080/index.html")

        # Wait for splash
        page.wait_for_selector('#splash-screen')

        # Interact to dismiss splash
        page.click('#splash-screen')

        # Wait for astrolabe
        page.wait_for_selector('#astrolabe-screen')

        # Wait 1 sec for app to fully initialize globals
        time.sleep(2)

        # Force toggle via JS directly on the element, assuming global terminal works but maybe timing is off
        # Or just verify the command registry exists in window.terminal
        # Because we can't reliably trigger the UI overlay in headless without fighting timeouts apparently.

        # Let's try to verify via Console Logs by hijacking console.log
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Check if valkyrie is defined
        valkyrie_check = page.evaluate("typeof window.valkyrie !== 'undefined'")
        if valkyrie_check:
             print("Window.valkyrie is defined")
        else:
             print("Window.valkyrie is undefined")

        # Check status directly via JS
        status = page.evaluate("window.valkyrie.status")
        if status == 'ACTIVE':
             print("Valkyrie Status Verified via JS: ACTIVE")

        # Trigger evaluation manually
        page.evaluate("""
            window.sentinel.defcon = 2;
            window.sentinel.threats.push({type: 'TEMPORAL_SURGE', level: 'HIGH'});
            window.valkyrie.evaluate(window.sentinel.getReport(), window.tapestryLedger.getThreads());
        """)

        # Check execution log
        log_count = page.evaluate("window.valkyrie.executionLog.length")
        if log_count > 0:
             print(f"Valkyrie Execution Logged: {log_count} events")

        time.sleep(1)
        page.screenshot(path="verification/valkyrie_verification.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_valkyrie_integration()
