const { execSync } = require('child_process');

console.log('Connecting to VPS 149.56.211.246...');

function runRemote(cmd) {
  const sshCmd = `ssh -i C:/Users/USER/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o BatchMode=yes root@149.56.211.246 "${cmd.replace(/"/g, '\\"')}"`;
  return execSync(sshCmd, { stdio: 'pipe', encoding: 'utf-8', timeout: 300000 });
}

try {
  console.log('1. Checking current PM2 status:');
  console.log(runRemote('pm2 status'));

  console.log('2. Pulling latest main on VPS:');
  console.log(runRemote('cd /var/www/fundedgiants && git fetch origin main && git reset --hard origin/main'));

  console.log('3. Clean up account 93410986 & wallet in PostgreSQL:');
  execSync('scp -i C:/Users/USER/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o BatchMode=yes scripts/clean_account_93410986.sql root@149.56.211.246:/tmp/clean_account_93410986.sql');
  console.log(runRemote('psql "postgresql://fundedgiants_prod:28%2CZeHHDHJw4F89@127.0.0.1:5432/fundedgiants_production" -f /tmp/clean_account_93410986.sql && rm /tmp/clean_account_93410986.sql'));

  console.log('4. Restamp certificate FG-PAY-653F54 on VPS:');
  execSync('scp -i C:/Users/USER/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o BatchMode=yes scripts/restamp_perfect.js root@149.56.211.246:/tmp/restamp_perfect.js');
  console.log(runRemote('cd /var/www/fundedgiants/apps/api && node /tmp/restamp_perfect.js && rm /tmp/restamp_perfect.js'));

  console.log('5. Building API & Trader Web on VPS:');
  console.log(runRemote('cd /var/www/fundedgiants && export NODE_OPTIONS="--max-old-space-size=4096" && pnpm --filter @fundedgiants/api build && pnpm --filter @fundedgiants/trader-web build'));

  console.log('6. Restarting PM2 services:');
  console.log(runRemote('pm2 reload fg-api fg-trader-web fg-admin-web || pm2 restart all'));

  console.log('7. Final PM2 status:');
  console.log(runRemote('pm2 status'));

  console.log('=== VPS DEPLOYMENT COMPLETED SUCCESSFULLY ===');
} catch (err) {
  console.error('Deployment error:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout);
  if (err.stderr) console.error('Stderr:', err.stderr);
  process.exit(1);
}
