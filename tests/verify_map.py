import unittest
from playwright.sync_api import sync_playwright
import time
import http.server
import socketserver
import threading
import os
import signal

# Helper to run server in background
class TestServer(threading.Thread):
    def __init__(self, port=8082):
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

class TestOverwatchMap(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = TestServer()
        cls.server.start()
        time.sleep(1) # Wait for server

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def setUp(self):
        self.p = sync_playwright().start()
        self.browser = self.p.chromium.launch(headless=True)
        self.page = self.browser.new_page()
        self.page.goto("http://localhost:8082")
        # Bypass splash
        self.page.click("#splash-screen")
        time.sleep(1)

    def tearDown(self):
        self.browser.close()
        self.p.stop()

    def test_map_toggle_and_rendering(self):
        # 1. Cheat navigation to Tapestry screen
        self.page.evaluate("window.showScreen('tapestry')")
        time.sleep(0.5)

        # 2. Check Map Toggle existence
        toggle_btn = self.page.locator("#map-toggle")
        self.assertTrue(toggle_btn.is_visible())

        # 3. Click toggle
        toggle_btn.click()
        time.sleep(0.5)

        # 4. Verify Canvas visibility swap
        tapestry_canvas = self.page.locator("#tapestry-canvas")
        map_canvas = self.page.locator("#map-canvas")

        self.assertFalse(tapestry_canvas.is_visible())
        self.assertTrue(map_canvas.is_visible())

        # 5. Verify State
        is_map_active = self.page.evaluate("window.state.isMapActive")
        self.assertTrue(is_map_active)

    def test_overwatch_command(self):
        # 1. Cheat navigation to Tapestry
        self.page.evaluate("window.showScreen('tapestry')")
        time.sleep(0.5)

        # 2. Run command
        # Open terminal
        self.page.keyboard.press("Control+Space")
        time.sleep(0.5)

        # Type command
        self.page.fill("#terminal-input", "overwatch")
        self.page.keyboard.press("Enter")
        time.sleep(0.5)

        # 3. Verify map toggle occurred via state
        is_map_active = self.page.evaluate("window.state.isMapActive")
        self.assertTrue(is_map_active)

        # 4. Verify terminal output
        # Close terminal to see? Or just check terminal log text
        terminal_content = self.page.text_content("#terminal-container")
        self.assertIn("ACTIVE", terminal_content)

if __name__ == '__main__':
    unittest.main()
