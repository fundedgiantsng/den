'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, RefreshCw, Filter, CheckCircle, Loader2 } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function RiskMonitorPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadRiskEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      if (eventTypeFilter) params.set('eventType', eventTypeFilter);

      const res = await fetchAdminApi(`/admin/risk/events?${params.toString()}`);
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load risk events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to resolve and clear this risk compliance event?')) {
      return;
    }
    setResolvingId(eventId);
    try {
      const res = await fetchAdminApi(`/admin/risk/events/${eventId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin compliance resolution' }),
      });
      if (res.success) {
        await loadRiskEvents();
      } else {
        alert(res.message || 'Failed to resolve risk event');
      }
    } catch (err: any) {
      alert('Error resolving risk event: ' + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    loadRiskEvents();
  }, [severityFilter, eventTypeFilter]);

  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const dailyBreachesCount = events.filter((e) => e.eventType === 'DAILY_DD_BREACH').length;
  const maxBreachesCount = events.filter((e) => e.eventType === 'MAX_DD_BREACH').length;

  return (
    <>
      <AdminHeader
        title="Risk Engine Monitoring & Breach Auditing"
        subtitle="Sub-second rule evaluation audit trail, timestamped equity snapshots, and broker liquidation logs"
      />

      <div className="p-8 space-y-6">
        {/* Risk Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Critical Risk Breaches"
            value={criticalCount}
            subtitle="Immediate liquidations triggered"
            icon={ShieldAlert}
            variant="rose"
          />
          <MetricCard
            title="4% Daily Drawdown Breaches"
            value={dailyBreachesCount}
            subtitle="23:00 GMT+1 baseline exceeded"
            icon={AlertTriangle}
            variant="rose"
          />
          <MetricCard
            title="Max Loss Floor Breaches"
            value={maxBreachesCount}
            subtitle="10% Rhino / 7% Phoenix static floor"
            icon={ShieldAlert}
            variant="default"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Rule Violation:</span>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Violations</option>
                <option value="DAILY_DD_BREACH">4% Daily DD Breach</option>
                <option value="MAX_DD_BREACH">Max Total DD Breach</option>
                <option value="INACTIVITY_BREACH">30-Day Inactivity Breach</option>
                <option value="ADMIN_MANUAL_LIQUIDATION">Manual Kill-Switch</option>
                <option value="DAILY_RESET_SNAPSHOT">Daily Session Snapshot</option>
              </select>
            </div>
          </div>

          <button
            onClick={loadRiskEvents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Events</span>
          </button>
        </div>

        {/* Risk Events Table */}
        <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Account #</th>
                  <th className="py-3.5 px-6">Trader</th>
                  <th className="py-3.5 px-6">Challenge</th>
                  <th className="py-3.5 px-6">Severity</th>
                  <th className="py-3.5 px-6">Rule Breached</th>
                  <th className="py-3.5 px-6">Snapshot Equity</th>
                  <th className="py-3.5 px-6">Details / Reason</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading risk audit events...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Zero risk breach events recorded.
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#142119]/50 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                        {formatDateTime(ev.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-white">
                        {ev.accountNumber || '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-white">{ev.customerName}</div>
                        <div className="text-[10px] text-slate-400">{ev.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-300">{ev.productName || '—'}</td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={ev.severity} />
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={ev.eventType} />
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-rose-400">
                        {formatNaira(ev.snapshotEquityNgn)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-300 max-w-sm">
                        {ev.description}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleResolveEvent(ev.id)}
                          disabled={resolvingId === ev.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                          title="Resolve and remove this breach event from risk records"
                        >
                          {resolvingId === ev.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          <span>Resolve</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
