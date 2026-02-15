import subprocess
import sys
import os
import shutil

def run_command(command_list):
    try:
        # Security hardening: Avoid shell=True to prevent injection
        # Use shutil.which to find executable if not absolute path
        cmd = command_list[0]
        if not os.path.isabs(cmd):
            executable = shutil.which(cmd)
            if not executable:
                print(f"Error: Command '{cmd}' not found in PATH.")
                sys.exit(1)
            command_list[0] = executable

        print(f"Executing: {' '.join(command_list)}")
        subprocess.check_call(command_list, shell=False)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {' '.join(command_list)}")
        sys.exit(1)

def deploy():
    print("Initiating Deployment Protocol...")

    # Clean install
    print("Restoring Supply Lines (npm ci)...")
    run_command(["npm", "ci"])

    # Build
    print("Compiling Artifacts (npm run build)...")
    run_command(["npm", "run", "build"])

    # Verify
    if os.path.exists("dist") and os.path.isdir("dist"):
        print("Payload Verified: dist/ directory created.")
        print("Deployment Protocol Complete. System Ready.")
    else:
        print("Critical Failure: dist/ directory missing.")
        sys.exit(1)

if __name__ == "__main__":
    deploy()
