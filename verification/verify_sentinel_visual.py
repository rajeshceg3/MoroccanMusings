
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Start local server
    try:
        page.goto("http://localhost:8000/index.html")
    except:
        print("Server not found")
        browser.close()
        return

    # Wait for app
    page.wait_for_selector("#splash-screen")

    # 1. Enter App
    page.click("#splash-screen")
    page.wait_for_selector("#astrolabe-screen")

    # 2. Go to Tapestry
    page.click("#tapestry-icon")
    page.wait_for_selector("#tapestry-screen")

    # 3. Simulate Sentinel Alert State (Inject Threads)
    page.evaluate("""() => {
        // Create temporal surge
        const now = Date.now();
        const threads = [];
        for(let i=0; i<6; i++) {
            threads.push({
                timestamp: now + (i*100),
                region: 'coast',
                intention: 'serenity',
                time: 'dawn'
            });
        }
        // Force assess
        window.sentinel.assess(threads);

        // Force update map
        const report = window.sentinel.getReport();
        const renderer = window.mapRenderer;
        if(renderer) {
            renderer.render([], window.locations, [], report.zones);
        }
    }""")

    # 4. Open Map to see visual indicator
    page.click("#map-toggle")

    # Wait for canvas to render
    page.wait_for_timeout(1000)

    # Take screenshot of the Map with Threat Zones
    page.screenshot(path="verification/sentinel_visual.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
