#!/bin/sh
#
# This script prepares the environment for Playwright E2E tests
# and then executes the test suite.
#

# Exit immediately if a command exits with a non-zero status.
set -e

# Define directories for test outputs
REPORTS_DIR="playwright-report"
RESULTS_DIR="test-results"

# 1. Ensure test output directories exist.
# The '-p' flag ensures the command doesn't fail if the directory already exists.
echo "Ensuring test output directories exist..."
mkdir -p "$REPORTS_DIR" "$RESULTS_DIR"

# 2. Set universal permissions to avoid UID/GID conflicts between the
#    host and the container's 'pwuser'.
echo "Setting permissions for output directories..."
chmod -R 777 "$REPORTS_DIR" "$RESULTS_DIR"
echo "Permissions set."

# 3. Execute the Playwright tests.
# 'exec' replaces the shell process with the test runner, ensuring that
# signals are passed correctly.
# '"$@"' passes along any arguments from the docker-compose command.
echo "Starting Playwright test runner..."
exec npx playwright test "$@"
