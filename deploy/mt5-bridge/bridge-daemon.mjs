/**
 * FundedGiants MT5 High-Speed TCP Multiplexing Bridge Daemon
 * Runs on London Debian VPS.
 * Connects the FundedGiants Backend API to the 12 segregated MT5 terminal EAs.
 */

import net from 'net';

const PORT = process.env.BRIDGE_PORT || 9090;
const HOST = process.env.BRIDGE_HOST || '0.0.0.0';

// Store connected MT5 terminals by targetAccount (e.g. 'PR-1M', 'RR-10M')
const mt5Clients = new Map();
// Store connected backend API clients
const apiClients = new Set();

const server = net.createServer((socket) => {
  socket.setNoDelay(true); // Disable Nagle's algorithm for sub-millisecond execution

  let clientType = 'UNKNOWN';
  let targetAccountTag = null;
  let buffer = '';

  console.log(`[Bridge Daemon] New socket connected from ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', (data) => {
    buffer += data.toString('utf8');
    let newlineIndex = buffer.indexOf('\n');

    while (newlineIndex >= 0) {
      const line = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);

      if (line.length > 0) {
        try {
          const message = JSON.parse(line);
          handleMessage(socket, message, (type, tag) => {
            clientType = type;
            targetAccountTag = tag;
          });
        } catch (err) {
          console.error(`[Bridge Daemon] JSON parse error: ${err.message} | Raw: ${line}`);
        }
      }
      newlineIndex = buffer.indexOf('\n');
    }
  });

  socket.on('error', (err) => {
    console.warn(`[Bridge Daemon] Socket error (${clientType}/${targetAccountTag}): ${err.message}`);
  });

  socket.on('close', () => {
    if (clientType === 'MT5' && targetAccountTag) {
      mt5Clients.delete(targetAccountTag);
      console.log(`[Bridge Daemon] MT5 Terminal disconnected: ${targetAccountTag}`);
    } else if (clientType === 'API') {
      apiClients.delete(socket);
      console.log(`[Bridge Daemon] Backend API client disconnected`);
    }
  });
});

function handleMessage(socket, message, setClientMeta) {
  // 1. Handshake from MT5 EA
  if (message.type === 'REGISTER') {
    const target = message.targetAccount;
    mt5Clients.set(target, socket);
    setClientMeta('MT5', target);
    console.log(`[Bridge Daemon] ⚡ MT5 Terminal REGISTERED for Target: [${target}]`);
    return;
  }

  // 2. Acknowledgment from MT5 EA back to API
  if (message.type === 'ACK' || message.type === 'ACK_CLOSE') {
    console.log(`[Bridge Daemon] 📥 MT5 ACK: Ticket ${message.steraTradeId} -> Broker Ticket: ${message.brokerTicketId || 'CLOSED'}`);
    // Broadcast ACK to all connected API clients
    const ackPayload = JSON.stringify(message) + '\n';
    for (const apiSocket of apiClients) {
      apiSocket.write(ackPayload);
    }
    return;
  }

  // 3. Trade routing instruction from Backend API
  if (message.action && message.targetAccount) {
    // If not registered as MT5, register as API client
    apiClients.add(socket);
    setClientMeta('API', null);

    const target = message.targetAccount;
    const targetSocket = mt5Clients.get(target);

    if (targetSocket && !targetSocket.destroyed) {
      targetSocket.write(JSON.stringify(message) + '\n');
      console.log(`[Bridge Daemon] ⚡ Dispatched ${message.action} to MT5 [${target}] | SteraTicket: ${message.steraTradeId} | Vol: ${message.volume || 'N/A'}`);
    } else {
      console.warn(`[Bridge Daemon] ⚠️ Target MT5 Terminal NOT CONNECTED: [${target}]. Trade dropped: ${message.steraTradeId}`);
    }
  }
}

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  FUNDEDGIANTS ULTRA-FAST MT5 BRIDGE DAEMON         `);
  console.log(`  Listening on ${HOST}:${PORT} (TCP_NODELAY: ON)   `);
  console.log(`====================================================`);
});
