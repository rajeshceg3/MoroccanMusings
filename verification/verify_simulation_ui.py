from playwright.sync_api import sync_playwright

def verify_simulation_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8087")

        # Wait for the app to initialize window.ui
        page.wait_for_function("typeof window.ui !== 'undefined'")

        # We can execute JS to trigger the modal directly since we refactored ui-system.js
        # We use the existing window.ui instance instead of trying to construct a new one awkwardly
        page.evaluate("""
            window.ui.showSimulationResults({
                baseline: { defcon: 5, balance: 50 },
                projected: { defcon: 5, balance: 55 },
                deltas: { defcon: 0, balance: 5, dominance: 'Harmony' },
                advisory: 'TACTICAL ADVANTAGE DETECTED. RECOMMENDED ACTION.'
            }, () => {}, () => {});
        """)

        page.wait_for_selector("#simulation-modal.visible")

        # Take screenshot
        page.screenshot(path="verification/simulation_modal.png")
        print("Screenshot taken: verification/simulation_modal.png")
        browser.close()

if __name__ == "__main__":
    verify_simulation_modal()
