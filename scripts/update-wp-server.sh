#!/usr/bin/env bash
# FundedGiants Live WordPress Server Update Script
# Run this on your WordPress server to automatically install and update all FundedGiants endpoints, tables, and shortcodes.

set -e

echo "=== FundedGiants WordPress Server Synchronizer ==="

# Find WordPress root
WP_DIR=""
POSSIBLE_DIRS=(
    "/var/www/html"
    "/var/www/fundedgiants"
    "/home/fundedgiants/public_html"
    "/home/*/public_html"
    "$PWD"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -f "$dir/wp-load.php" ]; then
        WP_DIR="$dir"
        break
    fi
done

if [ -z "$WP_DIR" ]; then
    echo "Please navigate to your WordPress installation directory (where wp-load.php is located) and run this script."
    exit 1
fi

echo "Found WordPress root at: $WP_DIR"
cd "$WP_DIR"

# Copy PHP updater to WP root and execute via PHP CLI
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/update-fundedgiants-wp.php"
if [ ! -f "$SCRIPT_PATH" ]; then
    # Download or copy from current dir
    if [ -f "./update-fundedgiants-wp.php" ]; then
        SCRIPT_PATH="./update-fundedgiants-wp.php"
    fi
fi

php -f "$SCRIPT_PATH" fg_sync_2026_update

echo "=== Done! WordPress Live Server Updated Successfully ==="
