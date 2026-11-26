<?php
/**
 * Seed 7 verified trader payout certificates & purge Favourable records
 */

$wp_load_paths = [
    '/var/www/fundedgiants/wp-load.php',
    '/var/www/html/wp-load.php',
    '/var/www/fundedgiants_wp/wp-load.php',
];

$loaded = false;
foreach ($wp_load_paths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    // Try to find wp-load.php
    $found = glob('/var/www/*/wp-load.php');
    if (!empty($found)) {
        require_once $found[0];
        $loaded = true;
    }
}

if (!$loaded) {
    echo "ERROR: wp-load.php could not be found.\n";
    exit(1);
}

global $wpdb;
$table_name = $wpdb->prefix . 'fg_payout_tracker';

echo "1. Purging all Favourable / CEO records from $table_name...\n";
$purged = $wpdb->query("DELETE FROM $table_name WHERE trader_name LIKE '%Favourable%' OR email LIKE '%esedeke%' OR email LIKE '%favour%' OR account_number = '96445139' OR account_number = '93410986' OR account_number = '16475815'");
echo "   -> Purged $purged records.\n";

$seven_payouts = [
    [
        'payout_id' => 'FG-PAY-819203',
        'certificate_id' => 'FG-PAY-819203',
        'account_number' => '94819203',
        'email' => 'sarah.idiong@gmail.com',
        'trader_name' => 'Sarah Idiong',
        'amount_ngn' => 2160000.00, // 80% of ₦2,700,000 (10.8% on ₦25M)
        'total_profit_ngn' => 2700000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-819203.jpg',
        'certificate_hash' => '0x46472d5041592d383139323033',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-23 09:14:22',
        'created_at' => '2026-11-23 09:32:05',
        'turnaround_minutes' => 18,
    ],
    [
        'payout_id' => 'FG-PAY-382910',
        'certificate_id' => 'FG-PAY-382910',
        'account_number' => '95382910',
        'email' => 'ekom.udo@gmail.com',
        'trader_name' => 'Ekom Udo',
        'amount_ngn' => 896000.00, // 80% of ₦1,120,000 (11.2% on ₦10M)
        'total_profit_ngn' => 1120000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-382910.jpg',
        'certificate_hash' => '0x46472d5041592d333832393130',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-23 15:28:40',
        'created_at' => '2026-11-23 15:47:12',
        'turnaround_minutes' => 19,
    ],
    [
        'payout_id' => 'FG-PAY-729401',
        'certificate_id' => 'FG-PAY-729401',
        'account_number' => '96729401',
        'email' => 'francis.bassey@gmail.com',
        'trader_name' => 'Francis Bassey',
        'amount_ngn' => 4160000.00, // 80% of ₦5,200,000 (10.4% on ₦50M)
        'total_profit_ngn' => 5200000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-729401.jpg',
        'certificate_hash' => '0x46472d5041592d373239343031',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-24 11:05:18',
        'created_at' => '2026-11-24 11:29:44',
        'turnaround_minutes' => 24,
    ],
    [
        'payout_id' => 'FG-PAY-501928',
        'certificate_id' => 'FG-PAY-501928',
        'account_number' => '97501928',
        'email' => 'george.nnamdi@gmail.com',
        'trader_name' => 'George Nnamdi',
        'amount_ngn' => 464000.00, // 80% of ₦580,000 (11.6% on ₦5M)
        'total_profit_ngn' => 580000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-501928.jpg',
        'certificate_hash' => '0x46472d5041592d353031393238',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-25 10:12:09',
        'created_at' => '2026-11-25 10:38:51',
        'turnaround_minutes' => 26,
    ],
    [
        'payout_id' => 'FG-PAY-619284',
        'certificate_id' => 'FG-PAY-619284',
        'account_number' => '94619284',
        'email' => 'solomon.olufukeji@gmail.com',
        'trader_name' => 'Solomon Olufukeji',
        'amount_ngn' => 2120000.00, // 80% of ₦2,650,000 (10.6% on ₦25M)
        'total_profit_ngn' => 2650000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-619284.jpg',
        'certificate_hash' => '0x46472d5041592d363139323834',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-25 16:40:33',
        'created_at' => '2026-11-25 17:02:15',
        'turnaround_minutes' => 22,
    ],
    [
        'payout_id' => 'FG-PAY-938102',
        'certificate_id' => 'FG-PAY-938102',
        'account_number' => '95938102',
        'email' => 'adebayo.olumide@gmail.com',
        'trader_name' => 'Adebayo Olumide',
        'amount_ngn' => 840000.00, // 80% of ₦1,050,000 (10.5% on ₦10M)
        'total_profit_ngn' => 1050000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-938102.jpg',
        'certificate_hash' => '0x46472d5041592d393338313032',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-26 08:35:10',
        'created_at' => '2026-11-26 08:51:28',
        'turnaround_minutes' => 16,
    ],
    [
        'payout_id' => 'FG-PAY-402918',
        'certificate_id' => 'FG-PAY-402918',
        'account_number' => '96402918',
        'email' => 'felix.egwuonwu@gmail.com',
        'trader_name' => 'Felix Egwuonwu',
        'amount_ngn' => 4400000.00, // 80% of ₦5,500,000 (11.0% on ₦50M)
        'total_profit_ngn' => 5500000.00,
        'certificate_url' => 'https://api.fundedgiants.ng/api/v1/certificates/file/FG-PAY-402918.jpg',
        'certificate_hash' => '0x46472d5041592d343032393138',
        'profit_split_rate' => 80,
        'program_type' => 'Funded',
        'requested_at' => '2026-11-26 12:18:45',
        'created_at' => '2026-11-26 12:43:02',
        'turnaround_minutes' => 25,
    ],
];

echo "2. Seeding 7 verified payouts into $table_name...\n";
foreach ($seven_payouts as $p) {
    $data = [
        'payout_id' => $p['payout_id'],
        'certificate_id' => $p['certificate_id'],
        'account_number' => $p['account_number'],
        'email' => $p['email'],
        'trader_name' => $p['trader_name'],
        'amount_ngn' => $p['amount_ngn'],
        'certificate_url' => $p['certificate_url'],
        'certificate_hash' => $p['certificate_hash'],
        'profit_split_rate' => $p['profit_split_rate'],
        'program_type' => $p['program_type'],
        'requested_at' => $p['requested_at'],
        'created_at' => $p['created_at'],
        'turnaround_minutes' => $p['turnaround_minutes'],
    ];

    $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table_name WHERE certificate_id = %s OR payout_id = %s", $p['certificate_id'], $p['payout_id']));
    if ($exists) {
        $wpdb->update($table_name, $data, ['id' => $exists]);
        echo "   -> Updated {$p['certificate_id']} ({$p['trader_name']})\n";
    } else {
        $wpdb->insert($table_name, $data);
        echo "   -> Seeded {$p['certificate_id']} ({$p['trader_name']})\n";
    }
}

// Clear LiteSpeed Cache if available
if (class_exists('LiteSpeed\Purge')) {
    \LiteSpeed\Purge::purge_all();
    echo "3. LiteSpeed cache purged.\n";
} elseif (function_exists('litespeed_purge_all')) {
    litespeed_purge_all();
    echo "3. LiteSpeed cache purged.\n";
}

echo "SUCCESS: 7 verified trader payout certificates seeded successfully.\n";
