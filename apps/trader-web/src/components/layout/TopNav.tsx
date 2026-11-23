'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Check, ExternalLink, User, LogOut, ChevronDown, Award, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { playNotificationChime } from '@/lib/audio';

interface TopNavProps {
  onMobileMenuToggle?: () => void;
}

export function TopNav({ onMobileMenuToggle }: TopNavProps) {
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    kycStatus?: string;
  } | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const previousUnreadRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotificationStats = () => {
    fetch(`${API_BASE_URL}/notifications/unread-count`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.unreadCount !== undefined) {
          if (previousUnreadRef.current !== null && data.unreadCount > previousUnreadRef.current) {
            playNotificationChime();
          }
          previousUnreadRef.current = data.unreadCount;
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});

    fetch(`${API_BASE_URL}/notifications`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setRecentNotifications(data.data.slice(0, 5));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchNotificationStats();
    const interval = setInterval(fetchNotificationStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Clear cookies client-side as well
    document.cookie = 'fg_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'fg_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const fullName = currentUser ? `${currentUser.firstName || 'Valued'} ${currentUser.lastName || 'Trader'}` : 'Trader';
  const initials = currentUser
    ? `${(currentUser.firstName?.[0] || 'V').toUpperCase()}${(currentUser.lastName?.[0] || 'T').toUpperCase()}`
    : 'JD';
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-fgBorder-subtle bg-bg-surface/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
      {/* Mobile Brand & Hamburger Button */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 rounded-xl bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative h-7 w-32">
          <Image
            src="/brand/logo-white.png"
            alt="FundedGiants"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

      {/* Desktop Search Input (Ctrl+K) */}
      <div className="relative w-80 hidden md:block">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fgText-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search accounts, trades, transactions..."
          className="w-full pl-9 pr-12 py-1.5 bg-bg-card rounded-lg border border-fgBorder-subtle text-xs text-white placeholder-fgText-muted focus:outline-none focus:border-emerald-500 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] text-fgText-muted bg-bg-surface rounded border border-fgBorder-subtle">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Notifications & Currency Indicator (Fixed NGN) */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Strict NGN Currency Indicator */}
        <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-bg-card border border-fgBorder-subtle flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] sm:text-xs font-semibold text-white tracking-wide">NGN (₦)</span>
        </div>

        {/* Notification Bell & Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-lg bg-bg-card border border-fgBorder-subtle text-fgText-secondary hover:text-white transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-bold shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-bg-surface border border-fgBorder-subtle shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-fgBorder-subtle pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-emerald-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-8 text-xs text-fgText-muted">
                    No new notifications
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border transition-all ${
                        !n.isRead
                          ? 'bg-[#09120e] border-emerald-500/30'
                          : 'bg-bg-card border-fgBorder-subtle/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {n.title}
                        </span>
                        <span className="text-[9px] text-fgText-muted whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-fgText-secondary line-clamp-2 mt-1">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-fgBorder-subtle pt-2 text-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-bold text-emerald-400 hover:text-white transition-colors block py-1"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 sm:gap-2.5 pl-1 sm:pl-2 border-l border-fgBorder-subtle hover:opacity-90 transition group focus:outline-none"
          >
            <div className="w-7 h-7 sm:w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30 group-hover:border-emerald-400 transition-colors">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors leading-tight">
                {fullName}
              </span>
              <span className="text-[10px] text-fgText-muted leading-none mt-0.5">
                {currentUser?.email || 'Verified Trader'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-fgText-muted transition-transform duration-200 hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#091218] border border-white/[0.08] shadow-2xl p-2 z-50">
              {/* User Info Header */}
              <div className="p-3 bg-[#060B11]/60 rounded-xl border border-white/[0.04] mb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate max-w-[140px]">
                    {fullName}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    currentUser?.kycStatus === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {currentUser?.kycStatus === 'APPROVED' ? 'KYC Verified' : 'Standard'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate font-mono">
                  {currentUser?.email || ''}
                </p>
              </div>

              {/* Navigation Links */}
              <div className="space-y-0.5 text-xs font-medium">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  My Profile
                </Link>

                <Link
                  href="/dashboard/certificates"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-yellow-400" />
                  Official Certificates
                </Link>

                <Link
                  href="/dashboard/settings/notifications"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-400" />
                  Settings
                </Link>
              </div>

              {/* Logout Action */}
              <div className="border-t border-white/[0.06] mt-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
