#!/usr/bin/env bash
# ==============================================================================
# FundedGiants - London Debian 12 Headless MT5 Multi-Terminal Setup Script
# Configures 12 Segregated MT5 Terminals under Wine + Xvfb
# ==============================================================================

set -e

echo "=== 1. Updating Debian 12 Baseline & Installing Prerequisites ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y wget curl gnupg2 software-properties-common xvfb procps git ufw

echo "=== 2. Installing Official WineHQ Staging for Debian 12 ==="
sudo dpkg --add-architecture i386
sudo mkdir -pm755 /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/debian/dists/bookworm/winehq-bookworm.sources
sudo apt update
sudo apt install -y --install-recommends winehq-staging

echo "=== 3. Installing Node.js for Bridge Daemon ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "=== 4. Setting up Headless Display with Xvfb ==="
cat << 'EOF' | sudo tee /etc/systemd/system/xvfb.service
[Unit]
Description=X Virtual Framebuffer Service for Headless MT5
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1024x768x16 -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now xvfb

echo "=== 5. Downloading MT5 Terminal Installer ==="
mkdir -p /opt/mt5_base
cd /opt/mt5_base
wget -O mt5setup.exe https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe

echo "=== 6. Initializing Base Wine Prefix and Portable MT5 ==="
export DISPLAY=:99
export WINEPREFIX="/root/.wine"
wine mt5setup.exe /auto

# Wait for MT5 installation to finalize
sleep 15
pkill -f terminal64.exe || true

echo "=== 7. Cloning Base MT5 into the 12 Segregated Accounts ==="
# 12 Target Accounts:
# Phoenix Rise (Instant): PR-1M, PR-2.5M, PR-5M, PR-10M, PR-25M, PR-50M
# Rhino Rush (Funded):   RR-1M, RR-2.5M, RR-5M, RR-10M, RR-25M, RR-50M

ACCOUNTS=("PR-1M" "PR-2.5M" "PR-5M" "PR-10M" "PR-25M" "PR-50M" "RR-1M" "RR-2.5M" "RR-5M" "RR-10M" "RR-25M" "RR-50M")

for ACC in "${ACCOUNTS[@]}"; do
  echo "Setting up instance /opt/mt5_${ACC}..."
  mkdir -p "/opt/mt5_${ACC}"
  cp -r /root/.wine/drive_c/Program\ Files/MetaTrader\ 5/* "/opt/mt5_${ACC}/"
  
  # Optimize config: disable news, sounds, limit chart bars to 1000
  mkdir -p "/opt/mt5_${ACC}/config"
  cat << EOF > "/opt/mt5_${ACC}/config/terminal.ini"
[Common]
NewsEnable=0
SoundEnable=0
MaxBars=1000
EOF

  # Copy FundedGiants_Bridge.mq5 to Experts directory
  mkdir -p "/opt/mt5_${ACC}/MQL5/Experts"
  cp /opt/mt5_base/FundedGiants_Bridge.mq5 "/opt/mt5_${ACC}/MQL5/Experts/" 2>/dev/null || true

  # Create Systemd service for this account
  cat << EOF | sudo tee "/etc/systemd/system/mt5-${ACC}.service"
[Unit]
Description=MetaTrader 5 Headless Instance - ${ACC}
After=network.target xvfb.service

[Service]
Environment=DISPLAY=:99
Environment=WINEPREFIX=/root/.wine
ExecStart=/usr/bin/wine /opt/mt5_${ACC}/terminal64.exe /portable
Restart=always
RestartSec=10
Nice=-10

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl enable "mt5-${ACC}.service"
done

echo "=== 8. Starting PM2 Bridge Daemon ==="
cd /opt/mt5-bridge
pm2 start bridge-daemon.mjs --name "fg-mt5-bridge"
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "=== Setup Completed Successfully! ==="
echo "All 12 MT5 headless instances and the Bridge Daemon are configured under systemd."
