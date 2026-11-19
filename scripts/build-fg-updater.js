const fs = require('fs');
const path = require('path');

const wpPublic = 'C:/Users/USER/Local Sites/fundedgiants/app/public';
const targetFiles = [
  'wp-content/plugins/fundedgiants-order-pay/templates/orchestrator-selection.php',
  'wp-content/plugins/fundedgiants-order-pay/templates/orchestrator-billing.php',
  'wp-content/plugins/fundedgiants-order-pay/inc/class-checkout-orchestrator.php',
  'wp-content/plugins/fundedgiants-order-pay/assets/js/orchestrator.js',
  'wp-content/plugins/fundedgiants-ngn-checkout/fundedgiants-ngn-checkout.php',
  'wp-content/plugins/fundedgiants-ngn-checkout/includes/class-nomba-provider.php',
  'wp-content/plugins/fundedgiants-ngn-checkout/includes/interface-provider.php',
  'wp-content/plugins/fundedgiants-ngn-checkout/includes/class-lenco-provider.php',
  'wp-content/plugins/fgt-core/fgt-core.php'
];

let filesArr = [];
for (const rel of targetFiles) {
  const full = path.join(wpPublic, rel);
  if (fs.existsSync(full)) {
    const b64 = fs.readFileSync(full).toString('base64');
    filesArr.push(`    '${rel}' => '${b64}',`);
    console.log('Packed:', rel, '(' + b64.length + ' b64 chars)');
  } else {
    console.warn('Missing:', full);
  }
}

const phpScript = `<?php
/**
 * FundedGiants One-Click WordPress Synchronizer & Updater
 * Automatically updates all verified Nomba webhook handlers, dual-secret HMAC,
 * coupon auto-routing, and checkout orchestrator improvements to this WordPress installation.
 *
 * Usage:
 * Upload this file to your WordPress public root directory (e.g. public_html/fg-sync-updater.php),
 * then visit in your browser: https://fundedgiants.ng/fg-sync-updater.php?key=fg_sync_2026_update
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');

$required_key = 'fg_sync_2026_update';
$provided_key = $_GET['key'] ?? ($_POST['key'] ?? '');

if ($provided_key !== $required_key) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0d1117;color:#fff;padding:40px;text-align:center;">';
    echo '<h1 style="color:#f85149;">Access Denied</h1>';
    echo '<p>Pass valid verification key: <code>?key=fg_sync_2026_update</code></p>';
    echo '</body></html>';
    exit;
}

$wp_root = __DIR__;
$files = array(
${filesArr.join('\n')}
);

$updated = 0;
$errors = array();

foreach ($files as $rel_path => $b64) {
    $target_file = $wp_root . '/' . $rel_path;
    $dir = dirname($target_file);
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true)) {
            $errors[] = "Failed to create directory {$dir}";
            continue;
        }
    }
    
    $content = base64_decode($b64);
    if ($content === false) {
        $errors[] = "Failed to decode content for {$rel_path}";
        continue;
    }
    
    // Backup existing file if present
    if (file_exists($target_file)) {
        @copy($target_file, $target_file . '.bak.' . time());
    }
    
    if (file_put_contents($target_file, $content) !== false) {
        $updated++;
    } else {
        $errors[] = "Failed to write {$target_file}";
    }
}

// Clear OPcache and LiteSpeed cache if available
if (function_exists('opcache_reset')) {
    @opcache_reset();
}

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>FundedGiants Update Complete</title>';
echo '<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#070a08;color:#e2e8f0;padding:40px;line-height:1.6;} .box{max-width:640px;margin:0 auto;background:#0c1610;border:1px solid #1a2f21;border-radius:12px;padding:30px;box-shadow:0 12px 32px rgba(0,0,0,0.5);} h1{color:#10b981;font-size:22px;margin-top:0;} .success{color:#10b981;font-weight:bold;} .file-item{background:#08100b;padding:8px 12px;border-radius:6px;margin:6px 0;font-family:monospace;font-size:13px;border-left:3px solid #10b981;}</style>';
echo '</head><body><div class="box">';
echo '<h1>FundedGiants Live WordPress Synchronized</h1>';
echo '<p class="success">' . $updated . ' core plugin files successfully installed and patched!</p>';
echo '<div style="margin:20px 0;">';
foreach (array_keys($files) as $f) {
    echo '<div class="file-item">' . htmlspecialchars($f) . '</div>';
}
echo '</div>';
if (!empty($errors)) {
    echo '<h3 style="color:#ef4444;">Errors encountered:</h3><ul>';
    foreach ($errors as $e) echo '<li style="color:#ef4444;">' . htmlspecialchars($e) . '</li>';
    echo '</ul>';
} else {
    echo '<p style="color:#94a3b8;font-size:13px;">Idempotent backup copies saved (.bak). You may delete this updater file from the server when finished.</p>';
}
echo '</div></body></html>';
`;

fs.writeFileSync('fg-sync-updater.php', phpScript, 'utf8');
console.log('Successfully written fg-sync-updater.php with size:', fs.statSync('fg-sync-updater.php').size);
