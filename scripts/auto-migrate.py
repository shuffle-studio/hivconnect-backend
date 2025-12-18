#!/usr/bin/env python3
"""
Auto-migration script for PayloadCMS
Handles interactive prompts automatically
"""

import pexpect
import sys
import os

def run_migration():
    # Change to the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)

    # Set environment variables
    env = os.environ.copy()
    env['NODE_ENV'] = 'production'
    env['PAYLOAD_SECRET'] = 'ignore'

    # Start the migration process
    cmd = "pnpm payload migrate:create add-bylaws-service-standards"

    print(f"Running: {cmd}")
    print(f"Environment: NODE_ENV=production PAYLOAD_SECRET=ignore")
    child = pexpect.spawn(cmd, encoding='utf-8', timeout=60, env=env)
    child.logfile = sys.stdout

    try:
        # Loop to handle all interactive prompts
        # Keep answering prompts until the migration completes
        prompt_count = 0
        max_prompts = 50  # Safety limit (increased for complex migrations)

        while prompt_count < max_prompts:
            # Wait for any migration prompt (table or column)
            patterns = [
                '.*table created or renamed.*',  # Table prompts
                '.*column.*created or renamed.*',  # Column prompts
                '--- all table conflicts resolved ---',  # Transition message
                pexpect.EOF,
                pexpect.TIMEOUT
            ]

            # Use longer timeout for first prompt, shorter for subsequent ones
            timeout = 30 if prompt_count == 0 else 10
            index = child.expect(patterns, timeout=timeout)

            if index == 0 or index == 1:
                # Found a table or column prompt - select default (create)
                prompt_count += 1
                print(f"\n>>> Prompt #{prompt_count}: Selecting default option (create)")
                child.sendline('\r')  # Press Enter to select the default

            elif index == 2:
                # Transition message - continue waiting for next prompt
                print("\n>>> Table conflicts resolved, checking for column prompts...")
                continue

            elif index == 3:
                # EOF reached - migration complete
                break

            elif index == 4:
                # Timeout - no more prompts, assume done
                print("\n>>> No more prompts detected")
                break

        # Wait for the command to complete
        child.expect(pexpect.EOF, timeout=10)
        child.close()

        if child.exitstatus == 0:
            print("\n✅ Migration created successfully!")
            return True
        else:
            print(f"\n❌ Migration failed with exit code: {child.exitstatus}")
            return False

    except pexpect.TIMEOUT:
        print("\n❌ Timeout waiting for migration prompt")
        child.close()
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        child.close()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
