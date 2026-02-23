#!/usr/bin/env python3
import os
import sys
import subprocess
import time

def log(msg, type="INFO"):
    colors = {
        "INFO": "\033[94m", # Blue
        "SUCCESS": "\033[92m", # Green
        "WARN": "\033[93m", # Yellow
        "ERROR": "\033[91m", # Red
    }
    end = "\033[0m"
    print(f"{colors.get(type, '')}[{type}] {msg}{end}")

def main():
    log("Initializing Operation Supply Line...", "INFO")

    # Check for npm
    if subprocess.call(["which", "npm"], stdout=subprocess.DEVNULL) != 0:
        log("npm not found. Aborting mission.", "ERROR")
        sys.exit(1)

    # Clean previous build
    if os.path.exists("dist"):
        log("Clearing previous artifacts...", "INFO")
        subprocess.run(["rm", "-rf", "dist"])

    # Execute Build
    log("Engaging build sequence...", "INFO")
    start_time = time.time()
    try:
        # Use shell=False for security, but ensure PATH is correct
        result = subprocess.run(["npm", "run", "build"], check=True, capture_output=True, text=True)
        log("Build execution complete.", "SUCCESS")
        # print(result.stdout)
    except subprocess.CalledProcessError as e:
        log("Build failed. Mission Critical Error.", "ERROR")
        print(e.stderr)
        sys.exit(1)

    # Verify Artifacts
    if not os.path.exists("dist/index.html"):
        log("Artifact verification failed: dist/index.html missing.", "ERROR")
        sys.exit(1)

    duration = time.time() - start_time
    log(f"Deployment payload secured in {duration:.2f}s.", "SUCCESS")
    log("System is READY for production deployment.", "SUCCESS")

if __name__ == "__main__":
    main()
