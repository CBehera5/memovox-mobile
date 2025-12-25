#!/bin/bash
# Automated cleanup script for MemoVox app
# Removes markdown guides, temp/cache files, and unused build artifacts

set -e

# Remove markdown and text guides
find . -maxdepth 1 -type f \( -name '*.md' -o -name '*.txt' \) -delete

# Remove Expo and build cache
rm -rf .expo .expo-shared dist build .cache *.tmp *.bak

# Remove IDE and OS files
rm -rf .vscode .idea *.swp *.swo *~ .DS_Store Thumbs.db

# Remove test and coverage files
rm -rf coverage .nyc_output

# Remove unused SQL and test JS files
find . -maxdepth 1 -type f \( -name '*.sql' -o -name 'test-*.js' \) -delete

# Remove node_modules if you want a fresh install (uncomment below)
# rm -rf node_modules

# Print completion message
echo "Cleanup complete. Your app directory is now compact!"
