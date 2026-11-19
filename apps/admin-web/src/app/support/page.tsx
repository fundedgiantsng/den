'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Ticket,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  User,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { fetchAdminApi } from '@/lib/api';

interface TicketMessage {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  relatedAccountId?: string;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  messages?: TicketMessage[];
}

interface ChatThread {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    kycStatus?: string;
  };
  lastMessage?: {
    id: string;
    message: string;
    senderRole: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface LiveChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'CHATS'>('TICKETS');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Reply & Status Update
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Live Chat Console
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<ChatThread['user'] | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  useEffect(() => {
    loadTickets();
    loadChatThreads();
  }, [statusFilter, categoryFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let url = '/support/admin/tickets?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (categoryFilter) url += `category=${categoryFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const data = await fetchAdminApi(url);
      if (data?.data) setTickets(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (id: string) => {
    try {
      const data = await fetchAdminApi(`/support/tickets/${id}`);
      if (data?.data) setSelectedTicket(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadChatThreads = async () => {
    try {
      const data = await fetchAdminApi('/support/admin/chats');
      if (data?.data) {
        setChatThreads(data.data);
        if (!selectedChatUser && data.data.length > 0) {
          setSelectedChatUser(data.data[0].user);
          loadUserChatMessages(data.data[0].user.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserChatMessages = async (userId: string) => {
    try {
      const data = await fetchAdminApi(`/support/admin/chats/${userId}`);
      if (data?.data) {
        setChatMessages(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll for active chat updates when on CHATS tab
  useEffect(() => {
    if (activeTab !== 'CHATS') return;

    const interval = setInterval(() => {
      loadChatThreads();
      if (selectedChatUser?.id) {
        loadUserChatMessages(selectedChatUser.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, selectedChatUser?.id]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      await fetchAdminApi(`/support/admin/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      await fetchAdminApi(`/support/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });

      setReplyMessage('');
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setReplying(false);
    }
  };

  const handleAdminSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUser || !adminChatInput.trim()) return;

    setSendingChat(true);
    const msg = adminChatInput;
    setAdminChatInput('');

    try {
      const data = await fetchAdminApi(`/support/admin/chats/${selectedChatUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });

      if (data?.data) {
        setChatMessages((prev) => [...prev, data.data]);
        loadChatThreads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-emerald-400" />
            <span>Support Desk Operations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage trader inquiries, resolve ticket threads, and provide live concierge chat assistance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadTickets();
            loadChatThreads();
          }}
          className="px-3.5 py-2 bg-[#0c1610] border border-[#1b3322] hover:border-emerald-500/40 rounded-xl text-xs font-medium text-slate-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#09120e] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block">Total Tickets</span>
          <span className="text-xl font-bold text-white mt-1 block">{tickets.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#09120e] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block">Open Inquiries</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {tickets.filter((t) => t.status === 'OPEN').length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#09120e] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block">In Progress</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">
            {tickets.filter((t) => t.status === 'IN_PROGRESS').length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#09120e] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 block">Active Chat Threads</span>
          <span className="text-xl font-bold text-white mt-1 block">{chatThreads.length}</span>
        </div>
      </div>

      {/* 3. Primary Tabs */}
      <div className="flex items-center gap-3 border-b border-[#1b3322] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('TICKETS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'TICKETS'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Tickets Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CHATS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CHATS'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat Console</span>
          {chatThreads.some((t) => t.unreadCount > 0) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      </div>

      {/* TAB 1: TICKETS QUEUE */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
                placeholder="Search ticket #, trader email, or subject..."
                className="w-full pl-10 pr-4 py-2 bg-[#09120e] rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#09120e] rounded-xl border border-[#1b3322] text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#09120e] rounded-xl border border-[#1b3322] text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              <option value="RULES">Trading Rules</option>
              <option value="TECHNICAL">Technical / SteraTrader</option>
              <option value="PAYOUT">Payouts & Vault</option>
              <option value="VERVE_CARD">Verve Card</option>
              <option value="ACCOUNT">Account Management</option>
              <option value="AFFILIATE">IB / Affiliates</option>
              <option value="BILLING">Billing & Checkout</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Ticket Master-Detail View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-1 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-[#09120e] border border-[#1b3322]">
                  No tickets match selected filters.
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      loadTicketDetails(t.id);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTicket?.id === t.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                        : 'bg-[#09120e] border-[#1b3322] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          t.status === 'OPEN'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{t.subject}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {t.user.firstName} {t.user.lastName} • {t.user.email}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                      <span className="px-1.5 py-0.2 rounded bg-black/40 border border-white/5">
                        {t.category}
                      </span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ticket Conversation & Action Details */}
            <div className="lg:col-span-2">
              {selectedTicket ? (
                <div className="p-6 rounded-2xl bg-[#09120e] border border-[#1b3322] space-y-6">
                  {/* Header & Status Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b3322] pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {selectedTicket.ticketNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                          {selectedTicket.priority} Priority
                        </span>
                        {selectedTicket.relatedAccountId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300">
                            Acct: {selectedTicket.relatedAccountId}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Trader: {selectedTicket.user.firstName} {selectedTicket.user.lastName} (
                        {selectedTicket.user.email}) • Phone: {selectedTicket.user.phone || 'N/A'}
                      </p>
                    </div>

                    {/* Change Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 bg-black/60 rounded-xl border border-[#1b3322] text-xs font-bold text-emerald-400 focus:outline-none"
                      >
                        <option value="OPEN">Mark Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                    {selectedTicket.messages?.map((msg) => {
                      const isSupport = msg.senderRole !== 'CUSTOMER';
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-xl border space-y-1.5 ${
                            isSupport
                              ? 'bg-emerald-500/10 border-emerald-500/30 ml-4'
                              : 'bg-black/40 border-[#1b3322] mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {isSupport ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">{msg.senderName}</span>
                                </>
                              ) : (
                                <>
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{msg.senderName}</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(msg.createdAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Box */}
                  <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-[#1b3322]">
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type official response to trader as FundedGiants Support..."
                      className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={replying || !replyMessage.trim()}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Send Official Response</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-16 rounded-2xl bg-[#09120e] border border-[#1b3322] text-center text-xs text-slate-500">
                  Select a ticket from the left queue to view conversation and dispatch a response.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CHAT CONSOLE */}
      {activeTab === 'CHATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Trader Chat Threads */}
          <div className="lg:col-span-1 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Trader Conversations
            </h3>
            {chatThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-[#09120e] border border-[#1b3322]">
                No live chat messages yet.
              </div>
            ) : (
              chatThreads.map((thread) => (
                <div
                  key={thread.user.id}
                  onClick={() => {
                    setSelectedChatUser(thread.user);
                    loadUserChatMessages(thread.user.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedChatUser?.id === thread.user.id
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-[#09120e] border-[#1b3322] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">
                      {thread.user.firstName} {thread.user.lastName}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500 text-black font-bold">
                        {thread.unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{thread.user.email}</p>
                  {thread.lastMessage && (
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {thread.lastMessage.message}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Interaction Window */}
          <div className="lg:col-span-2">
            {selectedChatUser ? (
              <div className="p-6 rounded-2xl bg-[#09120e] border border-[#1b3322] space-y-4">
                <div className="border-b border-[#1b3322] pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Live Chat with {selectedChatUser.firstName} {selectedChatUser.lastName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Email: {selectedChatUser.email} • WhatsApp: {selectedChatUser.phone || 'N/A'} • KYC: {selectedChatUser.kycStatus}
                    </p>
                  </div>
                </div>

                <div className="min-h-[380px] max-h-[460px] overflow-y-auto space-y-3 p-4 bg-black/40 rounded-xl border border-[#1b3322]">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-500">
                      Send a message below to engage this trader directly.
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isSupport = msg.senderRole !== 'CUSTOMER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[75%] ${
                            isSupport ? 'self-end ml-auto items-end' : 'self-start mr-auto'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              {isSupport ? 'You (Support)' : selectedChatUser.firstName}
                            </span>
                            <span className="text-[9px] text-slate-600">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isSupport
                                ? 'bg-emerald-500 text-black font-medium'
                                : 'bg-[#0c1610] text-white border border-[#1b3322]'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleAdminSendChat} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={adminChatInput}
                    onChange={(e) => setAdminChatInput(e.target.value)}
                    placeholder="Type message to trader..."
                    className="flex-1 px-4 py-3 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !adminChatInput.trim()}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-16 rounded-2xl bg-[#09120e] border border-[#1b3322] text-center text-xs text-slate-500">
                Select a trader chat from the left to start real-time concierge messaging.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
