'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Radio,
  Clock,
  ExternalLink,
  Volume2,
  Check,
  Loader2,
  Filter,
} from 'lucide-react';
import { playNotificationChime } from '@/lib/audio';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'TRADING' | 'FINANCE' | 'SECURITY' | 'SYSTEM' | 'BROADCAST';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  actionUrl?: string;
  emailSent: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/notifications', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setNotifications(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('http://localhost:4000/api/v1/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedCategory === 'ALL') return true;
    return n.category === selectedCategory;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'TRADING':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'FINANCE':
        return <Wallet className="w-5 h-5 text-[#f5a623]" />;
      case 'SECURITY':
        return <ShieldCheck className="w-5 h-5 text-sky-400" />;
      case 'BROADCAST':
        return <Radio className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-emerald-400" />
            <span>Activity Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-black">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
            Real-time trade milestones, profit payouts, security events, and platform announcements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Preview Test */}
          <button
            type="button"
            onClick={playNotificationChime}
            className="px-3.5 py-2 rounded-xl bg-bg-card border border-fgBorder-subtle hover:border-emerald-500/40 text-xs font-medium text-fgText-secondary hover:text-white flex items-center gap-2 transition-colors"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Test Sound</span>
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'TRADING', 'FINANCE', 'SECURITY', 'SYSTEM', 'BROADCAST'].map((cat) => {
          const count =
            cat === 'ALL'
              ? notifications.length
              : notifications.filter((n) => n.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white'
              }`}
            >
              <span>{cat === 'ALL' ? 'All Alerts' : cat}</span>
              <span className="ml-1.5 opacity-70 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-16 flex justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-16 rounded-2xl bg-bg-surface border border-fgBorder-subtle text-center space-y-3">
          <Bell className="w-10 h-10 text-fgText-muted mx-auto" />
          <h3 className="text-base font-bold text-white">No notifications</h3>
          <p className="text-xs text-fgText-secondary max-w-sm mx-auto">
            You're all caught up! New trade milestones, risk engine alerts, and payouts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.isRead && handleMarkAsRead(item.id)}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                !item.isRead
                  ? 'bg-[#09120e] border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'bg-bg-surface border-fgBorder-subtle hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    !item.isRead
                      ? 'bg-emerald-500/15 border-emerald-500/30'
                      : 'bg-bg-card border-fgBorder-subtle'
                  }`}
                >
                  {getCategoryIcon(item.category)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        !item.isRead ? 'text-white' : 'text-fgText-secondary'
                      }`}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-mono uppercase bg-white/[0.06] text-fgText-muted">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-fgText-secondary leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-fgText-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </span>
                    {item.emailSent && (
                      <span className="text-emerald-400/80">• Delivered via Email</span>
                    )}
                  </div>
                </div>
              </div>

              {item.actionUrl && (
                <Link
                  href={item.actionUrl}
                  className="px-3.5 py-1.5 rounded-lg bg-bg-card border border-fgBorder-subtle hover:border-emerald-500/40 text-xs font-medium text-emerald-400 hover:text-white flex items-center gap-1 self-start sm:self-center whitespace-nowrap transition-colors"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
