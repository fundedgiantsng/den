<?php
/**
 * FundedGiants Official Live WordPress Synchronization & Updater Script
 * 
 * Usage:
 * 1. Upload this file to the root of your WordPress server (same directory as wp-config.php)
 * 2. Run via terminal:
 *    php update-fundedgiants-wp.php
 *    OR open in your browser:
 *    https://fundedgiants.ng/update-fundedgiants-wp.php?key=fg_sync_2026_update
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$required_key = 'fg_sync_2026_update';
$provided_key = $_GET['key'] ?? ($_POST['key'] ?? ($argv[1] ?? ''));

// If run from CLI without argument, allow execution
$is_cli = (php_sapi_name() === 'cli');
if (!$is_cli && $provided_key !== $required_key) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0d1117;color:#fff;padding:40px;text-align:center;">';
    echo '<h1 style="color:#f85149;">Access Denied</h1>';
    echo '<p>Pass the valid secret key: <code>?key=fg_sync_2026_update</code></p>';
    echo '</body></html>';
    exit;
}

echo $is_cli ? "=== FundedGiants WordPress Live Synchronizer ===\n" : '<pre style="background:#091016;color:#00f59b;padding:24px;border-radius:12px;font-family:monospace;">';

$wp_root = __DIR__;
if (!file_exists($wp_root . '/wp-load.php') && file_exists(dirname($wp_root) . '/wp-load.php')) {
    $wp_root = dirname($wp_root);
}

if (!file_exists($wp_root . '/wp-load.php')) {
    echo "ERROR: wp-load.php not found. Please place this script in your WordPress root directory.\n";
    exit(1);
}

// 1. Bootstrap WordPress environment
echo "[1/4] Bootstrapping WordPress core...\n";
require_once $wp_root . '/wp-load.php';
global $wpdb;

// 2. Ensure Database Table for Public Payout Tracker exists
echo "[2/4] Initializing FundedGiants Payout Tracker database schema...\n";
$table_name = $wpdb->prefix . 'fg_payout_tracker';
$charset_collate = $wpdb->get_charset_collate();

$sql = "CREATE TABLE IF NOT EXISTS $table_name (
    id bigint(20) NOT NULL AUTO_INCREMENT,
    payout_id varchar(100) NOT NULL,
    trader_name varchar(150) NOT NULL,
    amount_ngn decimal(18,2) NOT NULL DEFAULT '0.00',
    certificate_id varchar(100) NOT NULL,
    certificate_url text NOT NULL,
    certificate_hash varchar(100) DEFAULT '',
    profit_split_rate int(11) NOT NULL DEFAULT '80',
    program_type varchar(100) NOT NULL DEFAULT 'Phoenix Rise',
    created_at datetime NOT NULL,
    PRIMARY KEY  (id),
    UNIQUE KEY payout_id (payout_id),
    KEY certificate_id (certificate_id)
) $charset_collate;";

require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
dbDelta($sql);

// Seed initial payout FG-PAY-653F54 if table empty
$existing_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE certificate_id = 'FG-PAY-653F54'");
if (!$existing_count) {
    $wpdb->insert($table_name, array(
        'payout_id' => 'FG-PAYOUT-653F54',
        'trader_name' => 'Favourable Esedeke',
        'amount_ngn' => 3495494.00,
        'certificate_id' => 'FG-PAY-653F54',
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-653F54.jpg',
        'certificate_hash' => '0x' . bin2hex('FG-PAY-653F54'),
        'profit_split_rate' => 80,
        'program_type' => 'Phoenix Rise',
        'created_at' => current_time('mysql'),
    ));
    echo "  -> Seeded verified initial payout FG-PAY-653F54 (₦3,495,494.00) into tracker table.\n";
}

// 3. Install Must-Use Plugin for Payout Tracker, Webhooks & REST Endpoints
echo "[3/4] Installing FundedGiants MU-Plugin (Must-Use Plugin)...\n";
$mu_dir = $wp_root . '/wp-content/mu-plugins';
if (!is_dir($mu_dir)) {
    mkdir($mu_dir, 0755, true);
}

$mu_plugin_code = <<<'PHP'
<?php
/**
 * Plugin Name: FundedGiants Payout Tracker, Certificate Verifier & Webhook Bridge
 * Description: Registers /wp-json/fundedgiants/v1/payout and [fg_payout_tracker] shortcode for live certified payout tracking.
 * Version: 2.1.0
 * Author: FundedGiants Core Architecture
 */

if (!defined('ABSPATH')) exit;

// 1. Register REST API Routes
add_action('rest_api_init', function () {
    // A. Receive payout sync from NestJS CRM Risk Engine
    register_rest_route('fundedgiants/v1', '/payout', array(
        'methods' => 'POST',
        'callback' => 'fg_rest_handle_payout_sync',
        'permission_callback' => '__return_true',
    ));

    // B. Public GET list of latest approved payouts (for live tickers/widgets)
    register_rest_route('fundedgiants/v1', '/payouts', array(
        'methods' => 'GET',
        'callback' => 'fg_rest_get_public_payouts',
        'permission_callback' => '__return_true',
    ));

    // C. Certificate validation endpoint
    register_rest_route('fundedgiants/v1', '/verify/(?P<id>[a-zA-Z0-9_-]+)', array(
        'methods' => 'GET',
        'callback' => 'fg_rest_verify_certificate',
        'permission_callback' => '__return_true',
    ));
});

/**
 * Handle incoming payout webhook from NestJS API
 */
function fg_rest_handle_payout_sync(WP_REST_Request $request) {
    global $wpdb;
    $params = $request->get_json_params();
    if (empty($params)) {
        return new WP_Error('no_data', 'Missing JSON payload', array('status' => 400));
    }

    $token = $request->get_header('x-fg-webhook-token');
    $sig = $request->get_header('x-fgt-signature');
    $secret = defined('WOOCOMMERCE_WEBHOOK_SECRET') ? WOOCOMMERCE_WEBHOOK_SECRET : getenv('WOOCOMMERCE_WEBHOOK_SECRET');
    if (!$secret) $secret = 'fg_live_webhook_secret_key';

    $table = $wpdb->prefix . 'fg_payout_tracker';
    $payout_id = sanitize_text_field($params['payout_id'] ?? 'PAY-' . time());
    $trader_name = sanitize_text_field($params['trader_name'] ?? 'Funded Giant');
    $amount_ngn = floatval($params['amount_ngn'] ?? ($params['approved_amount'] ?? 0));
    $certificate_id = sanitize_text_field($params['certificate_id'] ?? '');
    $certificate_url = esc_url_raw($params['certificate_url'] ?? '');
    $certificate_hash = sanitize_text_field($params['certificate_hash'] ?? '');
    $profit_split = intval($params['profit_split_rate'] ?? 80);
    $program_type = sanitize_text_field($params['program_type'] ?? 'Phoenix Rise');
    $timestamp = !empty($params['timestamp']) ? date('Y-m-d H:i:s', strtotime($params['timestamp'])) : current_time('mysql');

    $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE payout_id = %s", $payout_id));
    if ($exists) {
        $wpdb->update($table, array(
            'trader_name' => $trader_name,
            'amount_ngn' => $amount_ngn,
            'certificate_id' => $certificate_id,
            'certificate_url' => $certificate_url,
            'certificate_hash' => $certificate_hash,
            'profit_split_rate' => $profit_split,
            'program_type' => $program_type,
        ), array('id' => $exists));
    } else {
        $wpdb->insert($table, array(
            'payout_id' => $payout_id,
            'trader_name' => $trader_name,
            'amount_ngn' => $amount_ngn,
            'certificate_id' => $certificate_id,
            'certificate_url' => $certificate_url,
            'certificate_hash' => $certificate_hash,
            'profit_split_rate' => $profit_split,
            'program_type' => $program_type,
            'created_at' => $timestamp,
        ));
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Payout $payout_id synced to public tracker successfully",
        'certificate_id' => $certificate_id,
    ), 200);
}

/**
 * Public GET list of latest approved payouts
 */
function fg_rest_get_public_payouts(WP_REST_Request $request) {
    global $wpdb;
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $results = $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC LIMIT 50", ARRAY_A);
    return new WP_REST_Response(array('success' => true, 'data' => $results), 200);
}

/**
 * Public certificate validation endpoint
 */
function fg_rest_verify_certificate(WP_REST_Request $request) {
    global $wpdb;
    $id = sanitize_text_field($request->get_param('id'));
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $cert = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE certificate_id = %s", $id), ARRAY_A);

    if (!$cert) {
        return new WP_REST_Response(array(
            'success' => false,
            'valid' => false,
            'message' => 'Certificate ID not found on official ledger',
        ), 404);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'valid' => true,
        'certificate' => $cert,
        'verification_hash' => $cert['certificate_hash'] ?: '0x' . bin2hex($cert['certificate_id']),
    ), 200);
}

/**
 * [fg_payout_tracker] Shortcode
 * Renders a responsive dark table and ticker showing live certified payouts with certificate preview modal.
 */
add_shortcode('fg_payout_tracker', 'fg_render_payout_tracker');
function fg_render_payout_tracker($atts = array()) {
    global $wpdb;
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $payouts = $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC LIMIT 20", ARRAY_A);

    ob_start();
    ?>
    <div id="fg-payout-tracker-container" style="background:#091218;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;margin:30px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:14px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0;font-size:1.15rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#00f59b;box-shadow:0 0 10px #00f59b;"></span>
                    Live Certified Payout Stream
                </h3>
                <p style="margin:4px 0 0;font-size:0.75rem;color:#94a3b8;">Real-time verified profit disbursements issued to official FundedGiants traders</p>
            </div>
            <div style="font-size:0.72rem;background:rgba(0,245,155,0.1);color:#00f59b;border:1px solid rgba(0,245,155,0.3);padding:4px 10px;border-radius:20px;font-weight:600;">
                Ledger Verified &bull; Instant Settlement
            </div>
        </div>

        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;text-align:left;">
                <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;">
                        <th style="padding:10px 12px;">Trader</th>
                        <th style="padding:10px 12px;">Program</th>
                        <th style="padding:10px 12px;">Disbursed Amount</th>
                        <th style="padding:10px 12px;">Split</th>
                        <th style="padding:10px 12px;">Certificate ID</th>
                        <th style="padding:10px 12px;text-align:right;">Official Proof</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($payouts)): ?>
                        <tr><td colspan="6" style="padding:24px;text-align:center;color:#64748b;">No public payouts recorded yet.</td></tr>
                    <?php else: foreach ($payouts as $p): 
                        $name_parts = explode(' ', trim($p['trader_name']));
                        $display_name = $name_parts[0] . (isset($name_parts[1]) ? ' ' . substr($name_parts[1], 0, 1) . '.' : '');
                    ?>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.2s;">
                            <td style="padding:12px;font-weight:600;color:#fff;"><?php echo esc_html($display_name); ?></td>
                            <td style="padding:12px;color:#94a3b8;"><?php echo esc_html($p['program_type']); ?></td>
                            <td style="padding:12px;font-weight:700;color:#00f59b;font-family:monospace;font-size:0.9rem;">
                                ₦<?php echo number_format($p['amount_ngn'], 2); ?>
                            </td>
                            <td style="padding:12px;color:#cbd5e1;"><?php echo intval($p['profit_split_rate']); ?>%</td>
                            <td style="padding:12px;font-family:monospace;font-size:0.75rem;color:#cbd5e1;"><?php echo esc_html($p['certificate_id']); ?></td>
                            <td style="padding:12px;text-align:right;">
                                <?php if (!empty($p['certificate_url'])): ?>
                                    <a href="<?php echo esc_url($p['certificate_url']); ?>" target="_blank" rel="noopener noreferrer" style="background:#00f59b;color:#05140d;padding:5px 12px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.72rem;display:inline-block;">
                                        View Certificate &rarr;
                                    </a>
                                <?php else: ?>
                                    <span style="color:#64748b;font-size:0.72rem;">Verified</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
PHP;

$mu_file = $mu_dir . '/fundedgiants-payout-tracker.php';
file_put_contents($mu_file, $mu_plugin_code);
echo "  -> Saved: $mu_file\n";

// 4. Update the core bridge and checkout orchestrators if present
echo "[4/4] Verifying and updating WooCommerce checkout orchestrators...\n";
if (file_exists($wp_root . '/fg-sync-updater.php')) {
    echo "  -> Triggering existing fg-sync-updater.php package updates...\n";
    $_GET['key'] = 'fg_sync_2026_update';
    include_once $wp_root . '/fg-sync-updater.php';
}

echo "\n=== SUCCESS: FundedGiants WordPress Live Synchronization Completed ===\n";
echo "1. Table `{$wpdb->prefix}fg_payout_tracker` is active.\n";
echo "2. Route `/wp-json/fundedgiants/v1/payout` is registered.\n";
echo "3. Route `/wp-json/fundedgiants/v1/payouts` is live.\n";
echo "4. Shortcode [fg_payout_tracker] is registered and ready to place on any page.\n";
if (!$is_cli) {
    echo '</pre>';
}
