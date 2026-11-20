# FundedGiants Ultra-Fast MT5 A-Book Execution Bridge

This directory contains the production-grade, sub-millisecond A-Book trade replication infrastructure for FundedGiants.

It connects the FundedGiants Risk Engine directly to **12 segregated MT5 broker accounts** running headlessly on a Debian 12 Linux VPS in London.

---

## 1. Architecture Overview

```
                      [ TRADER ON STERATRADER ]
                                  │
               Real-Time HMAC Webhook Execution (<5ms)
                                  ▼
                    [ FUNDEDGIANTS RISK ENGINE ]
                     (apps/api/src/modules/risk)
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
[ Exploit & Rule Defense ]                     [ TradeRouterService ]
 • Ultra-Scalping (<30s)                        • Admin Gating (abookEnabled)
 • Prohibited News Straddling                   • 12-Account Segregation Target
 • One-Strike Auto-Termination                  • Lot Sizing (0.01 as-is, >=0.02 scaled)
          │                                               │
(If Breach: Force Close Hedged MT5)                       │
                                                          ▼
                                            [ Fast TCP Pipe (TCP_NODELAY) ]
                                            London VPS Port 9090 (<1ms)
                                                          │
                                                          ▼
                                            [ MT5 BRIDGE DAEMON (Linux) ]
                                            Multiplexes to 12 MT5 Terminals
                                                          │
                                                          ▼
                                            [ 12 Headless MT5 Terminals ]
                                            (Wine + Xvfb Portable Mode)
                                            • PR-1M  ... PR-50M
                                            • RR-1M  ... RR-50M
                                                          │
                                                          ▼
                                            [ BROKER ORDER EXECUTION ]
                                            (OrderSendAsync with 2.3 Pip Cushion)
```

---

## 2. The 12 Segregated Target Accounts

| Plan Type | Account Size | Target Account Tag | Copy Ratio Control |
| :--- | :--- | :--- | :--- |
| **Phoenix Rise (Instant)** | ₦1,000,000 | `PR-1M` | Set dynamically by Admin (Default 1.00) |
| **Phoenix Rise (Instant)** | ₦2,500,000 | `PR-2.5M` | Set dynamically by Admin (Default 1.00) |
| **Phoenix Rise (Instant)** | ₦5,000,000 | `PR-5M` | Set dynamically by Admin (Default 1.00) |
| **Phoenix Rise (Instant)** | ₦10,000,000 | `PR-10M` | Set dynamically by Admin (Default 1.00) |
| **Phoenix Rise (Instant)** | ₦25,000,000 | `PR-25M` | Set dynamically by Admin (Default 1.00) |
| **Phoenix Rise (Instant)** | ₦50,000,000 | `PR-50M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦1,000,000 | `RR-1M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦2,500,000 | `RR-2.5M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦5,000,000 | `RR-5M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦10,000,000 | `RR-10M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦25,000,000 | `RR-25M` | Set dynamically by Admin (Default 1.00) |
| **Rhino Rush (Funded)** | ₦50,000,000 | `RR-50M` | Set dynamically by Admin (Default 1.00) |

---

## 3. Recommended London VPS Providers Under $10/Month

For sub-2ms network ping to major institutional liquidity providers located at **Equinix LD4 (Slough/London)** and optimal proximity to Nigerian traders:

1. **Contabo (London, UK Datacenter) — Highly Recommended:**
   - **Specs:** 4 vCPU cores, 8 GB RAM, 75 GB NVMe (or 200 GB SSD), 1 Gbps unmetered port.
   - **Cost:** ~€5.50 – €7.50 / month (~$6.50 – $8.50/mo).
   - **Location:** Select United Kingdom (London).
   - **OS:** Debian 12 (Bookworm Minimal).

2. **Hostinger (UK Datacenter):**
   - **Specs:** KVM 2 / KVM 4: 2–4 vCPUs, 8 GB RAM, NVMe.
   - **Cost:** ~$7 – $10 / month.

3. **OVHcloud Public Cloud (London/Erith):**
   - When London availability is active, ~$7 – $10/month.

---

## 4. Debian 12 Deployment Steps

1. **Upload Bridge files to your VPS:**
   ```bash
   mkdir -p /opt/mt5-bridge
   # Copy bridge-daemon.mjs, FundedGiants_Bridge.mq5, setup-debian.sh into /opt/mt5-bridge
   ```

2. **Execute the Setup Script:**
   ```bash
   cd /opt/mt5-bridge
   chmod +x setup-debian.sh
   ./setup-debian.sh
   ```

3. **Log In to Broker Accounts on the 12 Terminals:**
   Each terminal is located at `/opt/mt5_<ACCOUNT>` (e.g. `/opt/mt5_PR-10M`).
   Run with VNC or attach to each portable instance once to enter login/password/server:
   ```bash
   wine /opt/mt5_PR-10M/terminal64.exe /portable
   ```

4. **Attach `FundedGiants_Bridge.mq5`:**
   - Open any blank chart (e.g. EURUSD M1).
   - Drag `FundedGiants_Bridge.mq5` onto the chart.
   - Set `InpTargetAccount` to match the instance (e.g. `PR-1M`).
   - The EA will instantly connect to `127.0.0.1:9090` and register itself with the Bridge Daemon.

---

## 5. Admin Manual Activation Workflow

In the FundedGiants Admin Web panel or via API:
- Endpoint: `POST /api/v1/risk/admin/abook/configure`
- Payload:
  ```json
  {
    "accountNumber": "ST-1092841",
    "enabled": true,
    "targetAccount": "PR-10M",
    "copyRatio": 0.50,
    "notes": "Trader passed evaluation, connected to A-Book"
  }
  ```
- Instant activation: All subsequent `TRADE_OPEN`, `TRADE_CLOSE`, and `TRADE_UPDATE` events from SteraTrader will be replicated instantly to the `PR-10M` MT5 broker terminal!
