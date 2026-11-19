'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Ticket,
  BookOpen,
  Search,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  ExternalLink,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  category: string;
  faqs: FaqItem[];
}

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
  messages?: TicketMessage[];
}

interface LiveChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'CHAT' | 'FAQS'>('TICKETS');
  const [faqs, setFaqs] = useState<FaqCategory[]>([]);
  const [searchFaq, setSearchFaq] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // WhatsApp Agent Data
  const [agentData, setAgentData] = useState<{
    agentName: string;
    supportPhone: string;
    availableHours: string;
    whatsappUrl: string;
  }>({
    agentName: 'FundedGiants Concierge',
    supportPhone: '+2348000000000',
    availableHours: '24/7 Priority Support',
    whatsappUrl: 'https://wa.me/2348000000000',
  });

  // Tickets
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'RULES',
    priority: 'NORMAL',
    relatedAccountId: '',
    message: '',
  });
  const [ticketReply, setTicketReply] = useState('');
  const [replying, setReplying] = useState(false);

  // Live Chat
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [newChatInput, setNewChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load FAQs and WhatsApp Agent Info
  useEffect(() => {
    fetch(`${API_BASE_URL}/support/faqs`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) setFaqs(data.data);
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/support/agent-contact`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) setAgentData(data.data);
      })
      .catch(() => {});

    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setTickets(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setSelectedTicket(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Live Chat auto-polling
  useEffect(() => {
    if (activeTab !== 'CHAT') return;

    const fetchChat = () => {
      fetch(`${API_BASE_URL}/support/chat`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.data) {
            setChatMessages(data.data);
            chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        })
        .catch(() => {});
    };

    fetchChat();
    const interval = setInterval(fetchChat, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;

    setSubmittingTicket(true);
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(ticketForm),
      });

      if (res.ok) {
        setNewTicketModalOpen(false);
        setTicketForm({
          subject: '',
          category: 'RULES',
          priority: 'NORMAL',
          relatedAccountId: '',
          message: '',
        });
        loadTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReply.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: ticketReply }),
      });

      if (res.ok) {
        setTicketReply('');
        loadTicketDetails(selectedTicket.id);
        loadTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReplying(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim() || sendingChat) return;

    setSendingChat(true);
    const msg = newChatInput;
    setNewChatInput('');

    try {
      const res = await fetch(`${API_BASE_URL}/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, data.data]);
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingChat(false);
    }
  };

  const filteredFaqs = faqs.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(searchFaq.toLowerCase()) ||
        f.a.toLowerCase().includes(searchFaq.toLowerCase())
    ),
  })).filter((cat) => cat.faqs.length > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header & Direct WhatsApp Concierge Hero */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-emerald-400" />
            <span>Help & Support Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
            24/7 dedicated support, ticketing, live agent messaging, and trading rules knowledge base.
          </p>
        </div>

        {/* Click to Chat WhatsApp Button */}
        <a
          href={agentData.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-all text-white group shadow-xl shadow-[#25D366]/10 self-start lg:self-auto"
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366] text-black font-extrabold flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            {/* WhatsApp SVG Icon */}
            <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.518-1.74-.718-2.852-2.484-2.939-2.6-.087-.115-.707-.94-.707-1.793 0-.853.449-1.272.608-1.446.16-.174.348-.217.464-.217.116 0 .232.001.333.006.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.183-.077.357.101.174.453.748.97 1.209.667.595 1.229.779 1.403.866.174.087.275.072.377-.044.101-.116.435-.506.551-.68.116-.174.232-.145.39-.087s1.014.478 1.188.565c.174.087.289.13.333.203.044.072.044.419-.1 1.024z"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.062c-1.637 0-3.158-.492-4.432-1.335l-.318-.21-2.96.828.845-2.887-.228-.335A8.026 8.026 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8.062-8 8.062z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white group-hover:text-[#25D366] transition-colors">
                Chat with Assigned Customer Agent
              </span>
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            </div>
            <p className="text-[11px] text-fgText-secondary">
              WhatsApp Concierge • Instant Response (24/7)
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-fgText-muted group-hover:text-white transition-colors ml-1" />
        </a>
      </div>

      {/* 2. Primary Tabs */}
      <div className="flex items-center gap-2 border-b border-fgBorder-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('TICKETS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'TICKETS'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-fgText-secondary hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Support Tickets</span>
          {tickets.filter((t) => t.status === 'OPEN').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-black font-bold">
              {tickets.filter((t) => t.status === 'OPEN').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CHAT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CHAT'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-fgText-secondary hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat Concierge</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FAQS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'FAQS'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-fgText-secondary hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Base & FAQs</span>
        </button>
      </div>

      {/* TAB 1: TICKETS */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Your Support Tickets</h2>
              <p className="text-xs text-fgText-secondary">
                Submit and track formal technical, rules, or payout inquiries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewTicketModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Ticket</span>
            </button>
          </div>

          {loadingTickets ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 rounded-2xl bg-bg-surface border border-fgBorder-subtle text-center space-y-3">
              <Ticket className="w-10 h-10 text-fgText-muted mx-auto" />
              <h3 className="text-base font-bold text-white">No active support tickets</h3>
              <p className="text-xs text-fgText-secondary max-w-sm mx-auto">
                Have a question regarding account rules, daily drawdown, or payouts? Submit a ticket and our team will respond promptly.
              </p>
              <button
                type="button"
                onClick={() => setNewTicketModalOpen(true)}
                className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Open First Ticket</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ticket List */}
              <div className="lg:col-span-1 space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      loadTicketDetails(t.id);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedTicket?.id === t.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                        : 'bg-bg-surface border-fgBorder-subtle hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'OPEN'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/10 text-fgText-muted border border-white/10'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white truncate">{t.subject}</h3>
                    <div className="flex items-center justify-between text-[10px] text-fgText-muted mt-2">
                      <span>{t.category}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ticket Detail / Thread View */}
              <div className="lg:col-span-2">
                {selectedTicket ? (
                  <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-6">
                    <div className="border-b border-fgBorder-subtle pb-4 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {selectedTicket.ticketNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                            {selectedTicket.priority} Priority
                          </span>
                          {selectedTicket.relatedAccountId && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-card border border-fgBorder-subtle text-fgText-secondary">
                              Account: {selectedTicket.relatedAccountId}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-bold text-white">{selectedTicket.subject}</h2>
                        <p className="text-[11px] text-fgText-muted mt-0.5">
                          Assigned: {selectedTicket.assignedAgentName || 'Concierge Support Team'}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          selectedTicket.status === 'OPEN'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : selectedTicket.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-white/10 text-fgText-muted'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>

                    {/* Messages Thread */}
                    <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                      {selectedTicket.messages?.map((msg) => {
                        const isSupport = msg.senderRole !== 'CUSTOMER';
                        return (
                          <div
                            key={msg.id}
                            className={`p-4 rounded-xl border space-y-1.5 ${
                              isSupport
                                ? 'bg-[#09120e] border-emerald-500/30 ml-4'
                                : 'bg-bg-card border-fgBorder-subtle mr-4'
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
                                    <User className="w-3.5 h-3.5 text-fgText-muted" />
                                    <span>{msg.senderName}</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] text-fgText-muted">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-fgText-secondary whitespace-pre-wrap leading-relaxed">
                              {msg.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Form */}
                    {selectedTicket.status !== 'CLOSED' ? (
                      <form onSubmit={handleReplyTicket} className="space-y-3 pt-2 border-t border-fgBorder-subtle">
                        <textarea
                          rows={3}
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          placeholder="Type your response to the support team..."
                          className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                          required
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={replying || !ticketReply.trim()}
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                          >
                            {replying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-fgText-muted">
                        This support ticket has been closed. Please create a new ticket if you require further assistance.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 rounded-2xl bg-bg-surface border border-fgBorder-subtle text-center text-fgText-muted text-xs">
                    Select a ticket from the list to view its full discussion and reply.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE CHAT */}
      {activeTab === 'CHAT' && (
        <div className="p-6 rounded-2xl bg-bg-surface border border-fgBorder-subtle space-y-4">
          <div className="border-b border-fgBorder-subtle pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>FundedGiants Concierge Live Chat</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-xs text-fgText-secondary">
                  Real-time direct messaging with our trading desk & support operations
                </p>
              </div>
            </div>
            <a
              href={agentData.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Prefer WhatsApp?</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Chat Messages Log */}
          <div className="min-h-[380px] max-h-[460px] overflow-y-auto space-y-3 p-4 bg-bg-card rounded-xl border border-fgBorder-subtle">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-xs text-fgText-muted">No messages in this chat session yet.</p>
                <p className="text-[11px] text-fgText-secondary">
                  Type your question below to start a live session with an assigned support specialist.
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isSupport = msg.senderRole !== 'CUSTOMER';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${
                      isSupport ? 'self-start mr-auto' : 'self-end ml-auto items-end'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-fgText-muted">
                        {isSupport ? 'Support Concierge' : 'You'}
                      </span>
                      <span className="text-[9px] text-fgText-muted">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isSupport
                          ? 'bg-[#09120e] text-white border border-emerald-500/30'
                          : 'bg-emerald-500 text-black font-medium'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="flex items-center gap-3">
            <input
              type="text"
              value={newChatInput}
              onChange={(e) => setNewChatInput(e.target.value)}
              placeholder="Ask a question about your account, payouts, or rules..."
              className="flex-1 px-4 py-3 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={sendingChat || !newChatInput.trim()}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE & FAQS */}
      {activeTab === 'FAQS' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fgText-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchFaq}
              onChange={(e) => setSearchFaq(e.target.value)}
              placeholder="Search trading rules, drawdown limits, KYC verification, payouts..."
              className="w-full pl-10 pr-4 py-3 bg-bg-surface rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Categorized FAQs */}
          <div className="space-y-6">
            {filteredFaqs.map((cat) => (
              <div key={cat.category} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                  {cat.category}
                </h3>
                <div className="space-y-2">
                  {cat.faqs.map((faq) => {
                    const isOpen = expandedFaq === faq.q;
                    return (
                      <div
                        key={faq.q}
                        className="rounded-xl bg-bg-surface border border-fgBorder-subtle overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isOpen ? null : faq.q)}
                          className="w-full p-4 text-left flex items-center justify-between gap-4 text-xs font-bold text-white hover:text-emerald-400 transition-colors"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-fgText-muted flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-fgText-muted flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-xs text-fgText-secondary border-t border-fgBorder-subtle/50 pt-3 leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {newTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !submittingTicket && setNewTicketModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-bg-surface border border-fgBorder-subtle rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-fgBorder-subtle pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Support Ticket</h3>
                  <p className="text-xs text-fgText-secondary">
                    Our desk prioritizes trading operations and payout assistance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewTicketModalOpen(false)}
                className="p-1 rounded-lg text-fgText-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fgText-secondary mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="e.g. Inquiry on Rhino Rush 2% profit cap reset"
                  className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-fgText-secondary mb-1">
                    Category
                  </label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="RULES">Trading Rules</option>
                    <option value="TECHNICAL">Technical / SteraTrader</option>
                    <option value="PAYOUT">Payouts & Giants Vault</option>
                    <option value="VERVE_CARD">Giants Verve Card</option>
                    <option value="ACCOUNT">Account Management</option>
                    <option value="AFFILIATE">IB / Affiliate Program</option>
                    <option value="BILLING">Billing & Checkout</option>
                    <option value="OTHER">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fgText-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fgText-secondary mb-1">
                  Related Trading Account (Optional)
                </label>
                <input
                  type="text"
                  value={ticketForm.relatedAccountId}
                  onChange={(e) => setTicketForm({ ...ticketForm, relatedAccountId: e.target.value })}
                  placeholder="e.g. #FG-48291"
                  className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fgText-secondary mb-1">
                  Message Details
                </label>
                <textarea
                  rows={4}
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Describe your request in detail..."
                  className="w-full px-4 py-2.5 bg-bg-card rounded-xl border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submittingTicket}
                  onClick={() => setNewTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-fgBorder-subtle text-xs font-medium text-fgText-secondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket || !ticketForm.subject || !ticketForm.message}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
