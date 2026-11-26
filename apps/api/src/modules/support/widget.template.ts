/**
 * FundedGiants Official 24/7 Front-Facing Embeddable AI Chat Widget
 * Self-contained JavaScript bundle injects into any webpage (WordPress, static pages, web portals)
 */

export function getChatWidgetScript(apiBaseUrl: string): string {
  return `(function() {
  'use strict';
  if (window.__FG_CHAT_INITIALIZED__) return;
  window.__FG_CHAT_INITIALIZED__ = true;

  const API_ENDPOINT = '${apiBaseUrl}/support/public-chat';
  const WHATSAPP_PHONE = '2348000000000';
  const STORAGE_KEY = 'fg_chat_device_id';

  // 1. Device ID Management
  function getDeviceId() {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = 'fg_dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }
  const deviceId = getDeviceId();

  // 2. Inject Scoped CSS
  const style = document.createElement('style');
  style.id = 'fg-chat-styles';
  style.textContent = \`
    .fg-chat-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
    }
    .fg-chat-widget * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .fg-chat-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .fg-chat-btn:hover {
      transform: scale(1.08);
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      box-shadow: 0 12px 30px rgba(34, 197, 94, 0.5);
    }
    .fg-chat-btn:active {
      transform: scale(0.96);
    }
    .fg-chat-btn svg {
      width: 28px;
      height: 28px;
      fill: #041409;
      transition: transform 0.25s ease;
    }
    .fg-chat-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #080e0b;
      box-shadow: 0 0 10px #22c55e;
      animation: fgPulse 2s infinite;
    }
    @keyframes fgPulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .fg-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 120px);
      background: #080e0b;
      border: 1px solid rgba(34, 197, 94, 0.28);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(34, 197, 94, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2147483647;
    }
    .fg-chat-window.fg-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .fg-chat-header {
      background: linear-gradient(180deg, #0f1c14 0%, #080e0b 100%);
      border-bottom: 1px solid rgba(34, 197, 94, 0.18);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fg-chat-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fg-chat-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #22c55e;
      position: relative;
    }
    .fg-chat-avatar svg {
      width: 20px;
      height: 20px;
      fill: #22c55e;
    }
    .fg-chat-avatar-status {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #22c55e;
      border: 1.5px solid #080e0b;
    }
    .fg-chat-title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }
    .fg-chat-sub {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .fg-chat-close-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .fg-chat-close-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    .fg-chat-chips-bar {
      padding: 10px 14px;
      background: #09120e;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .fg-chat-chips-bar::-webkit-scrollbar {
      display: none;
    }
    .fg-chat-chip {
      white-space: nowrap;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 20px;
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.25);
      color: #22c55e;
      cursor: pointer;
      transition: all 0.2s;
    }
    .fg-chat-chip:hover {
      background: rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.5);
    }
    .fg-chat-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #080e0b;
    }
    .fg-chat-msg {
      max-width: 85%;
      padding: 11px 14px;
      border-radius: 14px;
      font-size: 12px;
      line-height: 1.5;
      word-break: break-word;
    }
    .fg-chat-msg.fg-user {
      align-self: flex-end;
      background: #22c55e;
      color: #041409;
      font-weight: 600;
      border-bottom-right-radius: 3px;
    }
    .fg-chat-msg.fg-bot {
      align-self: flex-start;
      background: #0e1a13;
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: #f1f5f9;
      border-bottom-left-radius: 3px;
    }
    .fg-chat-time {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 4px;
      display: block;
      text-align: right;
    }
    .fg-chat-msg.fg-user .fg-chat-time {
      color: rgba(5, 20, 13, 0.6);
    }
    .fg-chat-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #0e1a13;
      border: 1px solid rgba(0, 245, 155, 0.2);
      border-radius: 14px;
      align-self: flex-start;
      border-bottom-left-radius: 3px;
    }
    .fg-chat-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: fgDot 1.4s infinite ease-in-out both;
    }
    .fg-chat-typing span:nth-child(1) { animation-delay: -0.32s; }
    .fg-chat-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes fgDot {
      0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
    .fg-chat-escalate-card {
      margin-top: 6px;
      padding: 10px 12px;
      background: rgba(37, 211, 102, 0.1);
      border: 1px solid rgba(37, 211, 102, 0.3);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .fg-chat-escalate-text {
      font-size: 11px;
      color: #25d366;
      font-weight: 600;
    }
    .fg-chat-escalate-btn {
      background: #25d366;
      color: #000;
      text-decoration: none;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .fg-chat-footer {
      background: #0b140f;
      border-top: 1px solid rgba(0, 245, 155, 0.15);
      padding: 12px 14px;
    }
    .fg-chat-form {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fg-chat-input {
      flex: 1;
      background: #050a07;
      border: 1px solid rgba(0, 245, 155, 0.25);
      border-radius: 12px;
      padding: 10px 14px;
      color: #fff;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
    }
    .fg-chat-input:focus {
      border-color: #22c55e;
    }
    .fg-chat-input::placeholder {
      color: #64748b;
    }
    .fg-chat-send {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #22c55e;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .fg-chat-send:hover {
      background: #16a34a;
    }
    .fg-chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .fg-chat-send svg {
      width: 18px;
      height: 18px;
      fill: #041409;
    }
    .fg-chat-disclaimer {
      font-size: 10px;
      color: #64748b;
      text-align: center;
      margin-top: 6px;
    }
    @media (max-width: 480px) {
      .fg-chat-window {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  \`;
  document.head.appendChild(style);

  // 3. Inject HTML Structure
  const container = document.createElement('div');
  container.className = 'fg-chat-widget';
  container.innerHTML = \`
    <button class="fg-chat-btn" id="fgChatToggle" aria-label="Open FundedGiants Support Chat">
      <div class="fg-chat-badge"></div>
      <svg id="fgChatIconOpen" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <svg id="fgChatIconClose" style="display:none;" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>

    <div class="fg-chat-window" id="fgChatWindow">
      <div class="fg-chat-header">
        <div class="fg-chat-brand">
          <div class="fg-chat-avatar">
            <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            <div class="fg-chat-avatar-status"></div>
          </div>
          <div>
            <div class="fg-chat-title">FundedGiants AI Concierge</div>
            <div class="fg-chat-sub">24/7 Live Desk &bull; Rules &amp; Payouts</div>
          </div>
        </div>
        <button class="fg-chat-close-btn" id="fgChatClose">&times;</button>
      </div>

      <div class="fg-chat-chips-bar">
        <div class="fg-chat-chip" data-q="What are the Rhino Rush rules?">Rhino Rush Rules</div>
        <div class="fg-chat-chip" data-q="What are the Phoenix Rise rules?">Phoenix Rise</div>
        <div class="fg-chat-chip" data-q="How is daily drawdown calculated?">Drawdown Limits</div>
        <div class="fg-chat-chip" data-q="How fast are payouts processed?">Payout Speed</div>
        <div class="fg-chat-chip" data-q="What trading platform is used?">SteraTrader</div>
        <div class="fg-chat-chip" data-q="I want to speak with a human support agent">Speak with Human</div>
      </div>

      <div class="fg-chat-body" id="fgChatBody">
        <div class="fg-chat-msg fg-bot">
          Hello! I am the official <strong>FundedGiants 24/7 Support Assistant</strong>. How can I help you today?
          <br><br>
          You can ask me about our <strong>Any of Our Account Type</strong>, <strong>drawdown limits and how they are calculated</strong>, or <strong>payout processing</strong>.
          <span class="fg-chat-time">Just now</span>
        </div>
      </div>

      <div class="fg-chat-footer">
        <form class="fg-chat-form" id="fgChatForm">
          <input type="text" class="fg-chat-input" id="fgChatInput" placeholder="Ask about rules, challenges, payouts..." autocomplete="off">
          <button type="submit" class="fg-chat-send" id="fgChatSend" aria-label="Send Message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
        <div class="fg-chat-disclaimer">FundedGiants AI Engine &bull; Instant Answers &bull; Escalate Anytime</div>
      </div>
    </div>
  \`;
  document.body.appendChild(container);

  // 4. State & DOM References
  const toggleBtn = document.getElementById('fgChatToggle');
  const closeBtn = document.getElementById('fgChatClose');
  const chatWindow = document.getElementById('fgChatWindow');
  const iconOpen = document.getElementById('fgChatIconOpen');
  const iconClose = document.getElementById('fgChatIconClose');
  const chatBody = document.getElementById('fgChatBody');
  const chatForm = document.getElementById('fgChatForm');
  const chatInput = document.getElementById('fgChatInput');
  const chatSend = document.getElementById('fgChatSend');
  let isOpen = false;
  let hasFetchedHistory = false;

  function toggleChat(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    if (isOpen) {
      chatWindow.classList.add('fg-open');
      iconOpen.style.display = 'none';
      iconClose.style.display = 'block';
      chatInput.focus();
      if (!hasFetchedHistory) {
        fetchChatHistory();
        hasFetchedHistory = true;
      }
    } else {
      chatWindow.classList.remove('fg-open');
      iconOpen.style.display = 'block';
      iconClose.style.display = 'none';
    }
  }

  toggleBtn.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));

  // Quick Chips
  document.querySelectorAll('.fg-chat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (q) {
        sendMessage(q);
      }
    });
  });

  // Formatting helpers
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }

  function formatBotText(raw) {
    let escaped = escapeHtml(raw);
    escaped = escaped.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\\n/g, '<br>');
    return escaped;
  }

  function appendMessage(text, role, isAi) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');
    msgDiv.className = 'fg-chat-msg ' + (role === 'USER' ? 'fg-user' : 'fg-bot');

    let contentHtml = role === 'USER' ? escapeHtml(text) : formatBotText(text);

    // If text mentions WhatsApp or human, show direct escalation button
    if (role !== 'USER' && (text.includes('wa.me') || text.toLowerCase().includes('whatsapp') || text.toLowerCase().includes('human') || text.toLowerCase().includes('specialist'))) {
      const waUrl = 'https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent('Hello FundedGiants Support, I need human concierge assistance with my trading inquiry: ' + text.slice(0, 80));
      contentHtml += \`
        <div class="fg-chat-escalate-card">
          <span class="fg-chat-escalate-text">Priority Human Desk</span>
          <a href="\${waUrl}" target="_blank" rel="noopener noreferrer" class="fg-chat-escalate-btn">
            Open WhatsApp &rarr;
          </a>
        </div>
      \`;
    }

    msgDiv.innerHTML = contentHtml + \`<span class="fg-chat-time">\${timeStr}</span>\`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'fg-chat-typing';
    typing.id = 'fgTypingIndicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('fgTypingIndicator');
    if (el) el.remove();
  }

  // Fetch past history for device
  async function fetchChatHistory() {
    try {
      const res = await fetch(\`\${API_ENDPOINT}?deviceId=\${encodeURIComponent(deviceId)}\`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          // Clear default welcome to render real history
          chatBody.innerHTML = '';
          data.data.forEach(m => {
            const role = m.senderRole === 'CUSTOMER' && !m.isAi ? 'USER' : 'BOT';
            appendMessage(m.message, role, m.isAi);
          });
        }
      }
    } catch (err) {
      console.warn('FundedGiants chat history fetch error:', err);
    }
  }

  // Send message
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    chatInput.value = '';
    chatSend.disabled = true;

    appendMessage(cleanText, 'USER', false);
    showTyping();

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceId,
          message: cleanText,
        }),
      });

      removeTyping();

      if (res.ok) {
        const json = await res.json();
        const aiMsg = json.data?.aiMessage?.message || json.data?.reply?.reply;
        if (aiMsg) {
          appendMessage(aiMsg, 'BOT', true);
        } else {
          appendMessage('Your message has been logged with our 24/7 concierge. A specialist will assist you shortly.', 'BOT', true);
        }
      } else {
        appendMessage('Thank you for reaching out. For instant priority assistance, you can also reach our assigned WhatsApp concierge anytime.', 'BOT', true);
      }
    } catch (e) {
      removeTyping();
      appendMessage('Connection error. You can reach our 24/7 priority desk on WhatsApp: https://wa.me/' + WHATSAPP_PHONE, 'BOT', true);
    } finally {
      chatSend.disabled = false;
      chatInput.focus();
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });
})();`;
}
