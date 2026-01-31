import subprocess
import os
import sys
import re

def run_command(command, description):
    print(f"[*] Running {description}...")
    try:
        subprocess.run(command, check=True, shell=True)
        print(f"[+] {description} PASSED.")
        return True
    except subprocess.CalledProcessError:
        print(f"[-] {description} FAILED.")
        return False

def check_console_logs(directory="js"):
    print(f"[*] Scanning {directory}/ for active console.log statements...")
    violation = False

    # Regex to find console.log, allowing for whitespace
    # We want to catch 'console.log(' but ignore '// console.log('
    # This is a simple heuristic.

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".js"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        stripped = line.strip()
                        if "console.log" in stripped:
                            # Check if commented out
                            # If '//' exists and is BEFORE console.log, it's safe.
                            comment_idx = stripped.find("//")
                            log_idx = stripped.find("console.log")

                            if comment_idx != -1 and comment_idx < log_idx:
                                continue # It's a comment

                            # Also check for block comments (simplified check)
                            # This script assumes one-line checks mostly.

                            print(f"[-] VIOLATION: {filepath}:{i+1} -> {stripped}")
                            violation = True

    if violation:
        print("[-] Console Log Scan FAILED.")
        return False
    else:
        print("[+] Console Log Scan PASSED.")
        return True

def main():
    print("=== TACTICAL PRE-COMMIT PROTOCOL ===")

    steps = [
        (lambda: run_command("npm run lint", "Linting"), "Linting"),
        (lambda: run_command("npm run test:unit", "Unit Verification"), "Unit Tests"),
        (lambda: check_console_logs(), "Console Log Scan")
    ]

    failed = False
    for step_func, name in steps:
        if not step_func():
            failed = True
            # We continue running other checks to show full report?
            # Or fail fast? Let's fail fast for "mission critical" feel,
            # but usually reporting all errors is better.
            # Let's Report All.

    if failed:
        print("\n[!] PRE-COMMIT FAILED. FIX VIOLATIONS.")
        sys.exit(1)
    else:
        print("\n[+] SYSTEM READY FOR DEPLOYMENT.")
        sys.exit(0)

if __name__ == "__main__":
    main()
