'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Radio,
  Send,
  Users,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  targetAudience: string;
  targetEmails?: string;
  sendEmail: boolean;
  recipientCount: number;
  dispatchedAt: string;
}

export default function AdminBroadcastNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [form, setForm] = useState({
    title: '',
    category: 'BROADCAST',
    priority: 'NORMAL',
    targetAudience: 'ALL' as 'ALL' | 'SPECIFIC_EMAILS',
    targetEmails: '',
    message: '',
    actionUrl: '',
    sendEmail: true,
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/notifications/admin/broadcasts');
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setBroadcasts(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/notifications/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch broadcast notification.');
      }

      setSuccess(data.message || 'Broadcast dispatched successfully!');
      setForm({
        title: '',
        category: 'BROADCAST',
        priority: 'NORMAL',
        targetAudience: 'ALL',
        targetEmails: '',
        message: '',
        actionUrl: '',
        sendEmail: true,
      });
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Radio className="w-6 h-6 text-emerald-400" />
          <span>Broadcast & Multi-Channel Notifications</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deliver urgent platform announcements, trading rules reminders, and market alerts directly to in-app notification bells and trader inboxes.
        </p>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Form */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[#09120e] border border-[#1b3322] space-y-6">
          <div className="border-b border-[#1b3322] pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Compose Broadcast Alert</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-dispatch to in-app bell + Brevo transactional email
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Announcement Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. SteraTrader Weekend Liquidity Hours Notice"
                className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, targetAudience: 'ALL' })}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                    form.targetAudience === 'ALL'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-black/30 border-[#1b3322] text-slate-400'
                  }`}
                >
                  All Active Traders
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, targetAudience: 'SPECIFIC_EMAILS' })}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                    form.targetAudience === 'SPECIFIC_EMAILS'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-black/30 border-[#1b3322] text-slate-400'
                  }`}
                >
                  Specific Emails
                </button>
              </div>
            </div>

            {form.targetAudience === 'SPECIFIC_EMAILS' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Emails (comma or line separated)
                </label>
                <textarea
                  rows={3}
                  value={form.targetEmails}
                  onChange={(e) => setForm({ ...form, targetEmails: e.target.value })}
                  placeholder="trader1@gmail.com, trader2@yahoo.com"
                  className="w-full px-4 py-2 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  required
                />
              </div>
            )}

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BROADCAST">Platform Broadcast</option>
                  <option value="TRADING">Trading / Markets</option>
                  <option value="FINANCE">Payouts / Vault</option>
                  <option value="SECURITY">Security / KYC</option>
                  <option value="SYSTEM">System Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent Alert</option>
                </select>
              </div>
            </div>

            {/* Action URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Action / Link URL (Optional)
              </label>
              <input
                type="text"
                value={form.actionUrl}
                onChange={(e) => setForm({ ...form, actionUrl: e.target.value })}
                placeholder="e.g. /dashboard/trading-accounts"
                className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Announcement Message
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Full announcement body delivered to dashboard & email..."
                className="w-full px-4 py-2.5 bg-black/40 rounded-xl border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                required
              />
            </div>

            {/* Email Dispatch Checkbox */}
            <div className="p-3 rounded-xl bg-black/30 border border-[#1b3322] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white font-medium">Deliver via Email</span>
              </div>
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending || !form.title || !form.message}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Multi-Channel Alert...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Broadcast Alert</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Broadcast History Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#09120e] border border-[#1b3322] space-y-6">
          <div className="border-b border-[#1b3322] pb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Broadcast Dispatch History</span>
            </h3>
            <span className="text-xs text-slate-400">{broadcasts.length} past dispatches</span>
          </div>

          {loadingHistory ? (
            <div className="p-16 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500">
              No broadcast notifications have been dispatched yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-black/40 border border-[#1b3322] space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{b.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {b.recipientCount} Recipients
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{b.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(b.dispatchedAt).toLocaleString()}</span>
                    </span>
                    <span className="text-emerald-400">
                      {b.sendEmail ? 'In-App + Email Delivered' : 'In-App Only'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
