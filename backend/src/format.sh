#!/bin/bash
#
# Auto-formats the Python code in this repository.

set -e

# Find all Python files in the repository.
files=$(find . -name "*.py")

# Format the files.
for file in $files; do
  echo "Formatting $file"
  black "$file"
  isort "$file"
done
