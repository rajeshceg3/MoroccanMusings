from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        url = "http://localhost:8081/index.html"
        print(f"Loading {url}...")

        try:
            page.goto(url)
            page.wait_for_selector("#splash-screen.active")
            page.click("#splash-screen")
            page.wait_for_selector("#astrolabe-screen.active")

            # Force show Broadcast UI for visual verification
            print("Force showing Broadcast UI...")
            page.evaluate("""
                document.getElementById('echo-overlay').classList.remove('hidden');
                document.getElementById('echo-status').textContent = 'BROADCASTING';
                document.getElementById('echo-message').textContent = 'Visual Verification Mode';

                // Draw something on canvas
                const canvas = document.getElementById('echo-visualizer');
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#c67605';
                ctx.beginPath();
                ctx.moveTo(0, 50);
                ctx.lineTo(100, 50);
                ctx.stroke();
            """)

            page.wait_for_timeout(500)
            page.screenshot(path="verification/echo_broadcast.png")
            print("Broadcast screenshot taken.")

            # Reset
            page.evaluate("document.getElementById('echo-overlay').classList.add('hidden')")

            # Force show Listen UI
            print("Force showing Listen UI...")
            page.evaluate("""
                document.getElementById('echo-overlay').classList.remove('hidden');
                document.getElementById('echo-status').textContent = 'LISTENING';
                document.getElementById('echo-message').textContent = 'Listening...';
            """)

            page.wait_for_timeout(500)
            page.screenshot(path="verification/echo_listen.png")
            print("Listen screenshot taken.")

            print("UI Visual Verification Complete.")

        except Exception as e:
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
