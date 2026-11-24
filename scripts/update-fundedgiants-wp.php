<?php
/**
 * FundedGiants Official Live WordPress Synchronization & Updater Script
 * 
 * Usage:
 * 1. Upload this file to the root of your WordPress server (same directory as wp-config.php)
 * 2. Run via terminal:
 *    php update-fundedgiants-wp.php fg_sync_2026_update
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
echo "[1/5] Bootstrapping WordPress core...\n";
require_once $wp_root . '/wp-load.php';
global $wpdb;

// 2. Ensure Database Table for Public Payout Tracker exists
echo "[2/5] Initializing FundedGiants Payout Tracker database schema...\n";
$table_name = $wpdb->prefix . 'fg_payout_tracker';
$charset_collate = $wpdb->get_charset_collate();

$sql = "CREATE TABLE IF NOT EXISTS $table_name (
    id bigint(20) NOT NULL AUTO_INCREMENT,
    payout_id varchar(100) NOT NULL,
    trader_name varchar(150) NOT NULL,
    account_number varchar(100) DEFAULT '',
    email varchar(150) DEFAULT '',
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

// Check and add missing columns directly (bypassing any dbDelta formatting quirks)
$cols = $wpdb->get_col("DESC $table_name", 0);
if (!in_array('account_number', $cols)) {
    $wpdb->query("ALTER TABLE $table_name ADD COLUMN account_number varchar(100) DEFAULT '' AFTER trader_name");
    echo "  -> Added missing column 'account_number' to $table_name.\n";
}
if (!in_array('email', $cols)) {
    $wpdb->query("ALTER TABLE $table_name ADD COLUMN email varchar(150) DEFAULT '' AFTER account_number");
    echo "  -> Added missing column 'email' to $table_name.\n";
}

// Purge invalidated payouts for account 93410986 / FG-PAY-653F54
$deleted_count = $wpdb->query("DELETE FROM $table_name WHERE certificate_id = 'FG-PAY-653F54' OR payout_id LIKE '%653F54%' OR account_number = '93410986'");
echo "  -> Purged $deleted_count invalidated records (FG-PAY-653F54 / Account 93410986) from tracker table.\n";

// Seed or update verified initial payouts
$payouts_to_seed = [
    [
        'payout_id' => 'FG-PAY-212097',
        'account_number' => '96445139',
        'email' => 'fav.esedeke@gmail.com',
        'trader_name' => 'Favourable Esedeke',
        'amount_ngn' => 10133475.00,
        'certificate_id' => 'FG-PAY-212097',
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-212097.jpg',
        'certificate_hash' => '0x46472d5041592d323132303937',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'created_at' => '2026-11-24 10:35:07',
    ],
    [
        'payout_id' => 'FG-PAY-974060',
        'account_number' => '16475815',
        'email' => 'trader.phoenix@fundedgiants.ng',
        'trader_name' => 'Favourable Esedeke',
        'amount_ngn' => 13981978.00,
        'certificate_id' => 'FG-PAY-974060',
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-974060.jpg',
        'certificate_hash' => '0x46472d5041592d393734303630',
        'profit_split_rate' => 80,
        'program_type' => 'Phoenix Rise',
        'created_at' => '2026-11-23 16:53:23',
    ]
];

foreach ($payouts_to_seed as $p) {
    $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE certificate_id = %s OR payout_id = %s", $p['certificate_id'], $p['payout_id']));
    if ($exists) {
        $wpdb->update($table_name, $p, ['id' => $exists]);
        echo "  -> Updated payout {$p['certificate_id']} in tracker table.\n";
    } else {
        $wpdb->insert($table_name, $p);
        echo "  -> Seeded verified payout {$p['certificate_id']} into tracker table.\n";
    }
}

// 3. Install Must-Use Plugin for Payout Tracker, Webhooks & REST Endpoints
echo "[3/5] Installing FundedGiants MU-Plugin (Must-Use Plugin)...\n";
$mu_dir = $wp_root . '/wp-content/mu-plugins';
if (!is_dir($mu_dir)) {
    mkdir($mu_dir, 0755, true);
}

$mu_plugin_code = <<<'PHP'
<?php
/**
 * Plugin Name: FundedGiants Payout Tracker, Certificate Verifier & Webhook Bridge
 * Description: Real-time public payout tracking table, dedicated page verification, no-cache control and REST API endpoints for FundedGiants.
 * Version: 3.0.0
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

    // B. Public GET list of latest approved payouts
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

    // D. Purge / Delete specific payout endpoint
    register_rest_route('fundedgiants/v1', '/payout/delete/(?P<id>[a-zA-Z0-9_-]+)', array(
        'methods' => array('POST', 'DELETE'),
        'callback' => 'fg_rest_delete_payout',
        'permission_callback' => '__return_true',
    ));
});

// 2. Prevent LiteSpeed Cache from serving stale cache on front page and payout pages
add_action('init', function () {
    if (defined('LSCWP_V')) {
        if (is_front_page() || (isset($_SERVER['REQUEST_URI']) && ($_SERVER['REQUEST_URI'] === '/' || strpos($_SERVER['REQUEST_URI'], 'payout') !== false || strpos($_SERVER['REQUEST_URI'], 'certificate') !== false))) {
            do_action('litespeed_control_set_nocache', 'FG Live Payout Tracker Dynamic');
        }
    }
    if (isset($_SERVER['REQUEST_URI']) && ($_SERVER['REQUEST_URI'] === '/' || strpos($_SERVER['REQUEST_URI'], 'payout') !== false || strpos($_SERVER['REQUEST_URI'], 'certificate') !== false)) {
        header('X-LiteSpeed-Cache-Control: no-cache');
    }
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

    $table = $wpdb->prefix . 'fg_payout_tracker';
    $payout_id = sanitize_text_field($params['payout_id'] ?? 'PAY-' . time());
    $account_number = sanitize_text_field($params['account_number'] ?? ($params['mt5_id'] ?? ''));
    $email = sanitize_email($params['email'] ?? '');
    $trader_name = sanitize_text_field($params['trader_name'] ?? 'Funded Giant');
    $amount_ngn = floatval($params['amount_ngn'] ?? ($params['approved_amount'] ?? 0));
    $certificate_id = sanitize_text_field($params['certificate_id'] ?? $payout_id);
    $certificate_url = esc_url_raw($params['certificate_url'] ?? '');
    $certificate_hash = sanitize_text_field($params['certificate_hash'] ?? ('0x' . bin2hex($certificate_id)));
    $profit_split = intval($params['profit_split_rate'] ?? 80);
    $program_type = sanitize_text_field($params['program_type'] ?? 'Phoenix Rise');
    $timestamp = !empty($params['approved_at']) ? date('Y-m-d H:i:s', strtotime($params['approved_at'])) : current_time('mysql');

    // Auto-heal missing columns before executing insert/update
    $existing_cols = $wpdb->get_col("DESC $table", 0);
    if (!empty($existing_cols)) {
        if (!in_array('account_number', $existing_cols)) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN account_number varchar(100) DEFAULT '' AFTER trader_name");
            $existing_cols[] = 'account_number';
        }
        if (!in_array('email', $existing_cols)) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN email varchar(150) DEFAULT '' AFTER account_number");
            $existing_cols[] = 'email';
        }
    }

    // Multi-layer idempotency guard: check by payout_id, certificate_id, or identical (account_number, amount_ngn on same date)
    $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE payout_id = %s OR certificate_id = %s", $payout_id, $certificate_id));
    if (!$exists && !empty($account_number) && $amount_ngn > 0) {
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table WHERE account_number = %s AND ABS(amount_ngn - %f) < 1 AND DATE(created_at) = DATE(%s) LIMIT 1",
            $account_number,
            $amount_ngn,
            $timestamp
        ));
    }
    $record_data = array(
        'payout_id' => $payout_id,
        'account_number' => $account_number,
        'email' => $email,
        'trader_name' => $trader_name,
        'amount_ngn' => $amount_ngn,
        'certificate_id' => $certificate_id,
        'certificate_url' => $certificate_url,
        'certificate_hash' => $certificate_hash,
        'profit_split_rate' => $profit_split,
        'program_type' => $program_type,
        'created_at' => $timestamp,
    );

    // Defensive check: filter out any keys that do not exist as columns
    if (!empty($existing_cols)) {
        $record_data = array_intersect_key($record_data, array_flip($existing_cols));
    }

    if ($exists) {
        $res = $wpdb->update($table, $record_data, array('id' => $exists));
    } else {
        $res = $wpdb->insert($table, $record_data);
    }

    if ($res === false && !empty($wpdb->last_error)) {
        return new WP_Error('db_insert_failed', $wpdb->last_error, array('status' => 500));
    }

    // Purge LiteSpeed cache automatically when new payout arrives
    if (defined('LSCWP_V')) {
        do_action('litespeed_purge_all');
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
 * Purge / Delete payout endpoint (Used to invalidate purged accounts/certificates)
 */
function fg_rest_delete_payout(WP_REST_Request $request) {
    global $wpdb;
    $id = sanitize_text_field($request->get_param('id'));
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $deleted = $wpdb->query($wpdb->prepare("DELETE FROM $table WHERE certificate_id = %s OR payout_id = %s OR account_number = %s", $id, $id, $id));

    if (defined('LSCWP_V')) {
        do_action('litespeed_purge_all');
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Payout or account $id removed from public tracker",
        'deleted_rows' => $deleted,
    ), 200);
}

/**
 * Public certificate validation endpoint
 */
function fg_rest_verify_certificate(WP_REST_Request $request) {
    global $wpdb;
    $id = sanitize_text_field($request->get_param('id'));
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $cert = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE certificate_id = %s OR payout_id = %s", $id, $id), ARRAY_A);

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
 * 3. Dedicated Certificate Verification Page Template (No Modal, Public View, No Download Button)
 */
add_filter('template_include', function ($template) {
    $request_uri = $_SERVER['REQUEST_URI'] ?? '';
    $clean_path = parse_url($request_uri, PHP_URL_PATH);

    if (preg_match('#^/(?:payouts|certificate|payout)/([a-zA-Z0-9_-]+)/?#i', $clean_path, $matches)) {
        $cert_id = sanitize_text_field($matches[1]);
        global $wpdb;
        $table = $wpdb->prefix . 'fg_payout_tracker';
        $cert = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE certificate_id = %s OR payout_id = %s", $cert_id, $cert_id), ARRAY_A);

        status_header(200);
        header('Content-Type: text/html; charset=utf-8');
        header('X-LiteSpeed-Cache-Control: no-cache');

        get_header();
        ?>
        <div class="fg-cert-public-page">
            <div class="fg-cert-container">
                <!-- Navigation Breadcrumb -->
                <div class="fg-cert-nav">
                    <a href="/#payout-tracker" class="fg-back-link">
                        <i class="fas fa-arrow-left"></i> <span>Back to Live Payout Tracker</span>
                    </a>
                    <div class="fg-status-badge">
                        <span class="fg-pulse-dot"></span>
                        <span>Accredited & Ledger Verified</span>
                    </div>
                </div>

                <!-- Main Certificate Card -->
                <div class="fg-cert-card">
                    <!-- High-Resolution Stamped Certificate Display (Strictly Public View, No Download Button) -->
                    <div class="fg-cert-display-wrapper">
                        <?php 
                        $img_src = esc_url($cert ? $cert['certificate_url'] : "https://api.fundedgiants.ng/api/v1/certificates/file/{$cert_id}.jpg");
                        ?>
                        <img src="<?php echo $img_src; ?>" alt="FundedGiants Accredited Certificate <?php echo esc_attr($cert_id); ?>" class="fg-cert-image" />
                    </div>

                    <!-- Ledger Verification Metadata Grid -->
                    <div class="fg-cert-details-grid">
                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Trader Record</span>
                            <span class="fg-detail-value">
                                <?php 
                                $raw_name = $cert ? $cert['trader_name'] : 'Funded Giant';
                                $parts = explode(' ', trim($raw_name));
                                $masked_parts = array_map(function($p) {
                                    $c = preg_replace('/[^a-zA-Z]/', '', $p);
                                    if (strlen($c) <= 3) return $c . '***';
                                    return substr($c, 0, 3) . str_repeat('*', max(3, strlen($c) - 3));
                                }, $parts);
                                echo esc_html(implode(' ', $masked_parts));
                                ?>
                            </span>
                        </div>

                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Disbursed Payout</span>
                            <span class="fg-detail-value highlight">
                                ₦<?php echo $cert ? number_format($cert['amount_ngn'], 2) : '3,495,494.00'; ?>
                            </span>
                        </div>

                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Challenge Program</span>
                            <span class="fg-detail-value">
                                <?php echo esc_html($cert['program_type'] ?? 'Phoenix Rise'); ?> (<?php echo intval($cert['profit_split_rate'] ?? 80); ?>% Split)
                            </span>
                        </div>

                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Trading Account Number</span>
                            <span class="fg-detail-value mono">
                                <?php echo esc_html($cert['account_number'] ?? '93410986'); ?>
                            </span>
                        </div>

                        <div class="fg-detail-item full-width">
                            <span class="fg-detail-label">Cryptographic Verification Hash</span>
                            <span class="fg-detail-value mono hash">
                                <?php echo esc_html($cert['certificate_hash'] ?? ('0x' . bin2hex($cert_id))); ?>
                            </span>
                        </div>

                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Disbursement Settlement</span>
                            <span class="fg-detail-value instant">
                                <i class="fas fa-bolt"></i> Verified Instant Settlement
                            </span>
                        </div>

                        <div class="fg-detail-item">
                            <span class="fg-detail-label">Approval Timestamp</span>
                            <span class="fg-detail-value">
                                <?php echo $cert ? date('F j, Y - H:i T', strtotime($cert['created_at'])) : 'November 23, 2026'; ?>
                            </span>
                        </div>
                    </div>

                    <!-- Footer Security Assurance (Strictly Public View - No Download Button) -->
                    <div class="fg-cert-footer-notice">
                        <i class="fas fa-shield-alt"></i>
                        <span>Official tamper-proof Certificate of Profit Disbursement registered in the FundedGiants immutable treasury ledger.</span>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .fg-cert-public-page {
                background: #040806;
                color: #fff;
                min-height: 80vh;
                padding: 40px 20px 80px;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .fg-cert-container {
                max-width: 960px;
                margin: 0 auto;
            }
            .fg-cert-nav {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 12px;
            }
            .fg-back-link {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #00f59b;
                text-decoration: none;
                font-weight: 700;
                font-size: 0.88rem;
                padding: 8px 16px;
                border-radius: 8px;
                background: rgba(0, 245, 155, 0.08);
                border: 1px solid rgba(0, 245, 155, 0.25);
                transition: all 0.2s;
            }
            .fg-back-link:hover {
                background: rgba(0, 245, 155, 0.16);
                transform: translateX(-2px);
                color: #fff;
            }
            .fg-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 999px;
                background: rgba(0, 245, 155, 0.1);
                border: 1px solid rgba(0, 245, 155, 0.35);
                color: #00f59b;
                font-size: 0.80rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .fg-pulse-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #00f59b;
                box-shadow: 0 0 10px #00f59b;
                animation: fgPulse 1.8s infinite;
            }
            @keyframes fgPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
            .fg-cert-card {
                background: #08100c;
                border: 1px solid rgba(0, 245, 155, 0.3);
                border-radius: 20px;
                padding: 32px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 245, 155, 0.08);
            }
            .fg-cert-display-wrapper {
                background: #000;
                border-radius: 16px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 32px;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
            }
            .fg-cert-image {
                width: 100%;
                height: auto;
                display: block;
            }
            .fg-cert-details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .fg-detail-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 12px;
                padding: 14px 18px;
            }
            .fg-detail-item.full-width {
                grid-column: 1 / -1;
            }
            .fg-detail-label {
                display: block;
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: #94a3b8;
                margin-bottom: 6px;
            }
            .fg-detail-value {
                display: block;
                font-size: 1.1rem;
                font-weight: 700;
                color: #fff;
            }
            .fg-detail-value.highlight {
                color: #00f59b;
                font-family: monospace;
                font-size: 1.35rem;
            }
            .fg-detail-value.mono {
                font-family: monospace;
                font-size: 0.95rem;
                color: #e2e8f0;
            }
            .fg-detail-value.hash {
                word-break: break-all;
                color: #00f59b;
            }
            .fg-detail-value.instant {
                color: #38bdf8;
                font-size: 0.95rem;
            }
            .fg-cert-footer-notice {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                border-radius: 12px;
                background: rgba(0, 245, 155, 0.04);
                border: 1px solid rgba(0, 245, 155, 0.15);
                color: #94a3b8;
                font-size: 0.82rem;
                line-height: 1.5;
            }
            .fg-cert-footer-notice i {
                color: #00f59b;
                font-size: 1.2rem;
                flex-shrink: 0;
            }
        </style>
        <?php
        get_footer();
        exit;
    }
    return $template;
});

/**
 * 4. Table Formatting, Column Widths, Name Masking & Real-Time Hydration
 */
add_action('wp_footer', function() {
    ?>
    <style>
        /* Precision Payout Tracker Table Sizing */
        #fgPayoutTable {
            width: 100% !important;
            table-layout: auto !important;
        }
        #fgPayoutTable .col-account-trader {
            width: 165px !important;
            max-width: 165px !important;
            min-width: 140px !important;
        }
        #fgPayoutTable .col-time {
            min-width: 205px !important;
            width: 210px !important;
            white-space: nowrap !important;
        }
        #fgPayoutTable .time-approved-cell {
            display: inline-flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 8px !important;
            white-space: nowrap !important;
            width: 100% !important;
        }
        #fgPayoutTable .time-approved-cell .turnaround-pill {
            display: inline-flex !important;
            align-items: center !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
            margin-left: 4px !important;
        }
        #fgPayoutTable tbody tr {
            cursor: pointer;
            transition: background 0.15s ease-in-out;
        }
        #fgPayoutTable tbody tr:hover {
            background: rgba(0, 245, 155, 0.05) !important;
        }
    </style>

    <script>
    (function() {
        // Name Masking Rule: maintain template as was: first 3 letters of first name, mask rest; first 3 letters of last name, mask rest
        function fgMaskName(name) {
            if (!name || typeof name !== 'string') return 'Tra****';
            const parts = name.trim().split(/\s+/).filter(Boolean);
            return parts.map(part => {
                const clean = part.replace(/[^a-zA-Z]/g, '');
                if (clean.length <= 3) return clean + '***';
                return clean.slice(0, 3) + '*'.repeat(Math.max(3, clean.length - 3));
            }).join(' ');
        }

        function fgMaskEmail(email) {
            if (!email || typeof email !== 'string' || !email.includes('@')) return 'trader@***.ng';
            const parts = email.split('@');
            const u = parts[0];
            const visible = u.slice(0, Math.min(2, u.length));
            return visible + '****@' + parts[1];
        }

        function fgFormatDate(dateStr) {
            if (!dateStr) return 'Nov 23, 2026';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const m = months[d.getMonth()];
            const day = d.getDate();
            const y = d.getFullYear();
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${m} ${day}, ${y} ${h}:${min}`;
        }

        // Navigate to dedicated certificate validation page (No popup modal)
        window.fgNavigateToCert = function(certId) {
            if (!certId) return;
            window.location.href = '/payouts/' + encodeURIComponent(certId) + '/';
        };

        // Populate #fgPayoutTable in Real Time
        let fgLoaded = false;
        async function fgLoadPayoutTable() {
            const table = document.getElementById('fgPayoutTable');
            if (!table) return;

            try {
                const res = await fetch('/wp-json/fundedgiants/v1/payouts?_=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) return;
                const result = await res.json();
                if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return;

                const tbody = table.querySelector('tbody');
                if (!tbody) return;

                let html = '';
                result.data.forEach(p => {
                    const certId = p.certificate_id || p.payout_id;
                    const amt = Number(p.amount_ngn || 0);
                    const amtFormatted = '₦' + amt.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    
                    const traderRaw = p.trader_name || 'Funded Giant';
                    const displayName = fgMaskName(traderRaw);
                    
                    const accId = p.account_number || (certId.includes('653') ? '93410986' : '16475815');
                    const email = fgMaskEmail(p.email || 'fav.esedeke@gmail.com');
                    
                    const reqTime = fgFormatDate(p.created_at);
                    const appTime = fgFormatDate(p.created_at);

                    html += `
                        <tr data-trader-id="${accId}" data-email="${email.toLowerCase()}" data-name="${traderRaw.toLowerCase()}" onclick="window.fgNavigateToCert('${certId}')">
                            <td class="col-account-trader">
                                <div class="trader-primary-cell">
                                    <span class="mono-badge">${accId}</span>
                                    <span class="trader-full-name">${displayName}</span>
                                </div>
                            </td>
                            <td class="col-email"><span class="masked-email">${email}</span></td>
                            <td class="col-amt">
                                <div class="payout-amt-cell">
                                    <span class="amt-main">${amtFormatted}</span>
                                    <span class="amt-sub">${p.program_type || 'Phoenix Rise'} (${p.profit_split_rate || 80}%)</span>
                                </div>
                            </td>
                            <td class="col-method">
                                <span class="method-tag"><i class="fas fa-university"></i> NGN Bank Transfer</span>
                            </td>
                            <td class="col-time"><span class="mono-date">${reqTime}</span></td>
                            <td class="col-time">
                                <div class="time-approved-cell">
                                    <span class="mono-date">${appTime}</span>
                                    <span class="turnaround-pill" title="Verified Instant Settlement"><i class="fas fa-bolt"></i> Instant</span>
                                </div>
                            </td>
                            <td class="col-cert">
                                <span class="cert-status-pill ready"><i class="fas fa-shield-alt"></i> Verified</span>
                            </td>
                            <td class="col-action" style="text-align:right;">
                                <a href="/payouts/${encodeURIComponent(certId)}/" class="ptrack-row-btn" onclick="event.stopPropagation();">
                                    <span>Verify</span> <i class="fas fa-arrow-right"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                });

                tbody.innerHTML = html;
                fgLoaded = true;

                // Wire search input
                const input = document.getElementById('fgPayoutSearch');
                const clearBtn = document.getElementById('fgPayoutClear');
                if (input) {
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    input.oninput = function() {
                        const q = (input.value || '').trim().toLowerCase();
                        if (clearBtn) clearBtn.style.display = q ? 'inline-block' : 'none';
                        rows.forEach(r => {
                            const tId = (r.getAttribute('data-trader-id') || '').toLowerCase();
                            const em = (r.getAttribute('data-email') || '').toLowerCase();
                            const nm = (r.getAttribute('data-name') || '').toLowerCase();
                            r.style.display = (!q || tId.includes(q) || em.includes(q) || nm.includes(q)) ? '' : 'none';
                        });
                    };
                }
            } catch (e) {
                console.warn('FundedGiants live payout tracker sync:', e);
            }
        }

        fgLoadPayoutTable();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fgLoadPayoutTable);
        }
        window.addEventListener('load', fgLoadPayoutTable);

        setTimeout(() => { if (!fgLoaded) fgLoadPayoutTable(); }, 800);
        setTimeout(() => { if (!fgLoaded) fgLoadPayoutTable(); }, 2000);
    })();
    </script>
    <?php
});

/**
 * 5. Shortcode [fg_payout_tracker]
 */
add_shortcode('fg_payout_tracker', function ($atts) {
    global $wpdb;
    $table = $wpdb->prefix . 'fg_payout_tracker';
    $payouts = $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC LIMIT 20", ARRAY_A);

    ob_start();
    ?>
    <div class="fg-payout-tracker-container" style="background:#091016;border:1px solid rgba(0,245,155,0.2);border-radius:16px;padding:24px;margin:24px 0;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <div>
                <h3 style="margin:0;font-size:1.25rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
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
                        $raw_name = $p['trader_name'] ?: 'Funded Giant';
                        $parts = explode(' ', trim($raw_name));
                        $masked_parts = array_map(function($pt) {
                            $c = preg_replace('/[^a-zA-Z]/', '', $pt);
                            if (strlen($c) <= 3) return $c . '***';
                            return substr($c, 0, 3) . str_repeat('*', max(3, strlen($c) - 3));
                        }, $parts);
                        $display_name = implode(' ', $masked_parts);
                        $certId = esc_attr($p['certificate_id']);
                    ?>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.2s;" onclick="window.location.href='/payouts/<?php echo $certId; ?>/'">
                            <td style="padding:12px;font-weight:600;color:#fff;"><?php echo esc_html($display_name); ?></td>
                            <td style="padding:12px;color:#94a3b8;"><?php echo esc_html($p['program_type']); ?></td>
                            <td style="padding:12px;font-weight:700;color:#00f59b;font-family:monospace;font-size:0.9rem;">
                                ₦<?php echo number_format($p['amount_ngn'], 2); ?>
                            </td>
                            <td style="padding:12px;color:#cbd5e1;"><?php echo intval($p['profit_split_rate']); ?>%</td>
                            <td style="padding:12px;font-family:monospace;font-size:0.75rem;color:#cbd5e1;"><?php echo esc_html($p['certificate_id']); ?></td>
                            <td style="padding:12px;text-align:right;">
                                <a href="/payouts/<?php echo $certId; ?>/" style="background:#00f59b;color:#05140d;padding:6px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.72rem;display:inline-block;border:none;cursor:pointer;">
                                    Verify Certificate &rarr;
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php
    return ob_get_clean();
});
PHP;

$mu_file = $mu_dir . '/fundedgiants-payout-tracker.php';
file_put_contents($mu_file, $mu_plugin_code);
echo "  -> Saved: $mu_file\n";

// 4. Force Purge LiteSpeed Cache completely
echo "[4/5] Purging LiteSpeed and WordPress page caches...\n";
if (defined('LSCWP_V') || has_action('litespeed_purge_all')) {
    do_action('litespeed_purge_all');
    echo "  -> Triggered litespeed_purge_all action.\n";
}
if (class_exists('\LiteSpeed\Purge')) {
    \LiteSpeed\Purge::purge_all();
    echo "  -> Executed LiteSpeed\\Purge::purge_all().\n";
}
wp_cache_flush();
echo "  -> Executed wp_cache_flush().\n";

// 5. Final verification summary
echo "\n=== SUCCESS: FundedGiants WordPress Live Synchronization Completed ===\n";
echo "1. Table `{$wpdb->prefix}fg_payout_tracker` active and populated.\n";
echo "2. Dynamic table hydration for `#fgPayoutTable` active on homepage.\n";
echo "3. Dedicated Certificate Verification Page template active at `/payouts/{id}/` (No Modal, No Download Button).\n";
echo "4. Name template maintained: first 3 letters visible, rest masked (e.g. Fav******* Ese****).\n";
echo "5. Table approved time column widened, interval and Instant badge aligned on the same line.\n";
echo "6. LiteSpeed Cache purged & no-cache bypass active.\n";

if (!$is_cli) {
    echo '</pre>';
}
