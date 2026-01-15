
from playwright.sync_api import sync_playwright
import time
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Start local server
    # Assuming server is running on port 8000 or similar.
    # We will use the file protocol if server is not reliable in this context,
    # but the instructions say "use local HTTP server".
    # We'll assume the environment has one, or we can use file:// if allowed.
    # Given the constraint of 'Secure Context' for crypto, file:// might fail some checks,
    # but Sentinel logic is pure JS.

    # Try connecting to localhost:8000 (standard for this env)
    try:
        page.goto("http://localhost:8000/index.html")
    except:
        print("Server not found, trying to start one or failing.")
        browser.close()
        return

    # Wait for app to load
    page.wait_for_selector("#splash-screen")

    # 1. Verify Sentinel Exists
    sentinel_exists = page.evaluate("() => !!window.sentinel")
    if not sentinel_exists:
        print("FAIL: window.sentinel not found")
        sys.exit(1)
    print("PASS: Sentinel initialized")

    # 2. Test Empty State
    report = page.evaluate("() => window.sentinel.assess([])")
    if report['defcon'] != 5:
        print(f"FAIL: Empty state DEFCON should be 5, got {report['defcon']}")
        sys.exit(1)
    print("PASS: Empty state check")

    # 3. Test Frequency Anomaly (Temporal Surge)
    # Inject 5 threads with same timestamp
    page.evaluate("""() => {
        const threads = [];
        const now = Date.now();
        for(let i=0; i<6; i++) {
            threads.push({
                timestamp: now + (i*100), // 100ms apart
                region: 'coast',
                intention: 'serenity',
                time: 'dawn'
            });
        }
        window.tempThreads = threads;
    }""")

    report = page.evaluate("() => window.sentinel.assess(window.tempThreads)")

    # Should trigger TEMPORAL_SURGE
    surge_detected = any(t['type'] == 'TEMPORAL_SURGE' for t in report['threats'])
    if not surge_detected:
        print("FAIL: Temporal Surge not detected")
        print(report)
        sys.exit(1)

    if report['defcon'] >= 5:
        print(f"FAIL: DEFCON did not drop (is {report['defcon']})")
        sys.exit(1)

    print(f"PASS: Temporal Surge detected. DEFCON {report['defcon']}")

    # 4. Test Geospatial Clustering
    # Already tested implicitly above since all were 'coast', let's check for specific threat type
    cluster_detected = any(t['type'] == 'LOCALIZED_CONGESTION' for t in report['threats'])
    if not cluster_detected:
        print("FAIL: Localized Congestion not detected")
        sys.exit(1)
    print("PASS: Geospatial Clustering detected")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
