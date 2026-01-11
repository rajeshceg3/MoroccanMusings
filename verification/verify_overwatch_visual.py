from playwright.sync_api import sync_playwright
import time
import http.server
import socketserver
import threading

# Helper to run server
class TestServer(threading.Thread):
    def __init__(self, port=8083):
        super().__init__()
        self.port = port
        self.server = None
        self.daemon = True

    def run(self):
        handler = http.server.SimpleHTTPRequestHandler
        self.server = socketserver.TCPServer(("", self.port), handler)
        print(f"Test server running on port {self.port}")
        self.server.serve_forever()

    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()

def run_verification():
    server = TestServer()
    server.start()
    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        try:
            # 1. Start App
            page.goto("http://localhost:8083")
            page.click("#splash-screen")
            time.sleep(1)

            # 2. Add some data via cheating
            page.evaluate("""
                window.state.intention = 'serenity';
                window.state.time = 'dawn';
                window.state.region = 'coast';
                window.tapestryLedger.addThread({
                    intention: 'serenity',
                    time: 'dawn',
                    region: 'coast',
                    title: 'Essaouira Ramparts'
                });
                window.tapestryLedger.addThread({
                    intention: 'vibrancy',
                    time: 'midday',
                    region: 'medina',
                    title: 'Fes el-Bali'
                });
                window.tapestryLedger.addThread({
                    intention: 'awe',
                    time: 'dusk',
                    region: 'sahara',
                    title: 'Erg Chebbi'
                });
            """)

            # 3. Navigate to Tapestry
            # page.evaluate("window.showScreen('tapestry')") # Use cheat nav
            # Or use UI:
            # page.click("#tapestry-icon") # This was flaky in unit test, let's try cheat to be sure for screenshot
            page.evaluate("window.showScreen('tapestry')")
            time.sleep(1)

            # 4. Toggle Map Overwatch
            page.click("#map-toggle")
            time.sleep(1)

            # 5. Take Screenshot
            page.screenshot(path="verification/overwatch_map.png")
            print("Screenshot saved to verification/overwatch_map.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
            server.stop()

if __name__ == "__main__":
    run_verification()
