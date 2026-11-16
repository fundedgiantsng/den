'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Trophy,
  Filter,
  Eye,
  RefreshCw,
  Plus,
  Gift,
  Settings,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatNaira, formatDate } from '@/lib/formatters';
import { fetchAdminApi } from '@/lib/api';

export default function AdminChallengesPage() {
  const [activeTab, setActiveTab] = useState<'instances' | 'programs'>('instances');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isGrantOpen, setIsGrantOpen] = useState(false);

  // Form states - Create / Edit Program
  const [programForm, setProgramForm] = useState({
    sku: '',
    skuPrefix: 'rhino-rush',
    name: '',
    type: 'ONE_STEP',
    accountSize: 5000000,
    priceNgn: 45000,
    dailyDrawdownPercent: 4.0,
    maxDrawdownPercent: 10.0,
    profitTargetPercent: 10.0,
    leverage: '1:100',
    profitSplit: '80:20',
    isActive: true,
  });

  // Form states - Grant Challenge
  const [grantUserEmail, setGrantUserEmail] = useState('');
  const [grantProductId, setGrantProductId] = useState('');
  const [grantReason, setGrantReason] = useState('Promotional / Contest Winner');
  const [grantDiscount, setGrantDiscount] = useState<number>(100);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetchAdminApi(`/admin/challenges?${params.toString()}`);
      if (res.success) {
        setChallenges(res.data);
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetchAdminApi('/admin/challenges/products');
      if (res.success) {
        setProducts(res.data);
        if (res.data.length > 0 && !grantProductId) {
          setGrantProductId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load challenge products:', err);
    }
  };

  useEffect(() => {
    loadChallenges();
    loadProducts();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadChallenges();
  };

  const handleOpenEditProduct = (prod: any) => {
    setSelectedProduct(prod);
    setProgramForm({
      sku: prod.sku,
      skuPrefix: prod.skuPrefix,
      name: prod.name,
      type: prod.type,
      accountSize: prod.accountSize,
      priceNgn: prod.priceNgn,
      dailyDrawdownPercent: prod.dailyDrawdownPercent,
      maxDrawdownPercent: prod.maxDrawdownPercent,
      profitTargetPercent: prod.profitTargetPercent,
      leverage: prod.leverage,
      profitSplit: prod.profitSplit,
      isActive: prod.isActive,
    });
    setIsEditProgramOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      if (selectedProduct) {
        // Update
        const res = await fetchAdminApi(`/admin/challenges/products/${selectedProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(programForm),
        });
        setActionSuccess(res.message || 'Challenge rules updated successfully.');
      } else {
        // Create
        const res = await fetchAdminApi('/admin/challenges/products', {
          method: 'POST',
          body: JSON.stringify(programForm),
        });
        setActionSuccess(res.message || 'New challenge program created.');
      }
      await loadProducts();
      setTimeout(() => {
        setIsCreateProgramOpen(false);
        setIsEditProgramOpen(false);
        setActionSuccess(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save challenge product.');
    }
  };

  const handleGrantChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Find user ID from customers API or search
      const custRes = await fetchAdminApi(`/admin/customers?search=${encodeURIComponent(grantUserEmail.trim())}`);
      const user = custRes.data?.[0];
      if (!user) {
        throw new Error(`Customer with email "${grantUserEmail}" not found. Verify email address.`);
      }

      const res = await fetchAdminApi('/admin/challenges/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          productId: grantProductId,
          grantReason,
          discountPercent: grantDiscount,
        }),
      });

      setActionSuccess(res.message || 'Challenge granted and SteraTrader account provisioned successfully.');
      await loadChallenges();
      setTimeout(() => {
        setIsGrantOpen(false);
        setActionSuccess(null);
        setGrantUserEmail('');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to grant challenge.');
    } finally {
      setGrantSubmitting(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="Full-Cycle Challenges & Rules Management"
        subtitle="Operational oversight, rule authoring, dynamic pricing, and direct challenge grants"
      />

      <div className="p-8 space-y-6 max-w-7xl">
        {/* Top Control Bar: Navigation Tabs & Action Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('instances')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-extrabold transition ${
                activeTab === 'instances'
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-[#00f59b]'
                  : 'bg-[#0f1712] border border-[#1b3322] text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Active Trader Challenges ({challenges.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('programs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-extrabold transition ${
                activeTab === 'programs'
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-[#00f59b]'
                  : 'bg-[#0f1712] border border-[#1b3322] text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Challenge Programs & Rules ({products.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                setIsGrantOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-heading font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Gift className="w-4 h-4 stroke-[2.5]" />
              <span>Offer / Grant Challenge</span>
            </button>

            <button
              onClick={() => {
                setSelectedProduct(null);
                setProgramForm({
                  sku: '',
                  skuPrefix: 'rhino-rush',
                  name: '',
                  type: 'ONE_STEP',
                  accountSize: 5000000,
                  priceNgn: 45000,
                  dailyDrawdownPercent: 4.0,
                  maxDrawdownPercent: 10.0,
                  profitTargetPercent: 10.0,
                  leverage: '1:100',
                  profitSplit: '80:20',
                  isActive: true,
                });
                setActionError(null);
                setActionSuccess(null);
                setIsCreateProgramOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00f59b] hover:from-emerald-500 hover:to-[#00ffaa] text-black text-xs font-heading font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Challenge</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ACTIVE TRADER CHALLENGES (OPERATIONAL VIEW)       */}
        {/* ======================================================== */}
        {activeTab === 'instances' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#0f1712] border border-[#1b3322] p-4 rounded-xl">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search challenge #, SteraTrader account #, or trader..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </form>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="PENDING_PROVISIONING">Pending Provisioning</option>
                  </select>
                </div>

                <button
                  onClick={loadChallenges}
                  className="p-2 rounded-lg bg-[#070a08] border border-[#1b3322] text-slate-400 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Challenges Table */}
            <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070a08] border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                    <tr>
                      <th className="py-3.5 px-6">Challenge #</th>
                      <th className="py-3.5 px-6">Trader</th>
                      <th className="py-3.5 px-6">Product & Size</th>
                      <th className="py-3.5 px-6">SteraTrader Account</th>
                      <th className="py-3.5 px-6">Live Equity</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Loading challenges...
                        </td>
                      </tr>
                    ) : challenges.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No challenge instances found.
                        </td>
                      </tr>
                    ) : (
                      challenges.map((ch) => (
                        <tr key={ch.id} className="hover:bg-[#142119]/50 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-bold text-white">
                            {ch.challengeNumber}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-white">{ch.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{ch.customerEmail}</div>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-slate-200">{ch.productName}</div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              {formatNaira(ch.accountSizeNgn)}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-mono font-semibold text-white">
                            {ch.accountNumber || 'Pending Provisioning'}
                          </td>
                          <td className="py-3.5 px-6 font-mono font-bold text-emerald-400">
                            {formatNaira(ch.currentEquityNgn || ch.accountSizeNgn)}
                          </td>
                          <td className="py-3.5 px-6">
                            <StatusBadge status={ch.status} />
                          </td>
                          <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                            {formatDate(ch.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PROGRAMS & RULES CATALOG (RULE AUTHORING VIEW)   */}
        {/* ======================================================== */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0f1712] border border-[#1b3322] overflow-hidden">
              <div className="p-4 bg-[#070a08] border-b border-[#1b3322] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Challenge Programs & Rules Matrix</h3>
                  <p className="text-[11px] text-slate-400">
                    Configure initial balance, entry pricing, drawdown caps, profit targets, leverage, and 80/20 profit splits
                  </p>
                </div>
                <button
                  onClick={loadProducts}
                  className="p-1.5 rounded-lg bg-[#0f1712] border border-[#1b3322] text-slate-400 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070a08]/50 border-b border-[#1b3322] text-slate-400 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-5">Program Name & SKU</th>
                      <th className="py-3 px-5">Type</th>
                      <th className="py-3 px-5">Account Capital</th>
                      <th className="py-3 px-5">Entry Fee</th>
                      <th className="py-3 px-5">Daily Drawdown</th>
                      <th className="py-3 px-5">Max Drawdown</th>
                      <th className="py-3 px-5">Profit Target</th>
                      <th className="py-3 px-5">Leverage</th>
                      <th className="py-3 px-5">Profit Split</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b3322]/60 text-slate-300">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#142119]/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{p.sku}</div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-[11px] text-emerald-400">
                          {p.type}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-white">
                          {formatNaira(p.accountSize)}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-300">
                          {formatNaira(p.priceNgn)}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-amber-400">
                          {p.dailyDrawdownPercent}%
                        </td>
                        <td className="py-3.5 px-5 font-mono text-rose-400">
                          {p.maxDrawdownPercent}%
                        </td>
                        <td className="py-3.5 px-5 font-mono text-emerald-400 font-bold">
                          {p.profitTargetPercent}%
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-300">
                          {p.leverage}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-300">
                          {p.profitSplit}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                              p.isActive
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="px-2.5 py-1 rounded-lg bg-[#070a08] border border-[#1b3322] hover:border-emerald-500/40 text-[11px] font-semibold text-emerald-400 hover:text-white transition flex items-center gap-1 ml-auto"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Edit Rules</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: CREATE / EDIT CHALLENGE PROGRAM                 */}
        {/* ======================================================== */}
        {(isCreateProgramOpen || isEditProgramOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0b1612] border border-emerald-500/30 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 relative">
              <button
                onClick={() => {
                  setIsCreateProgramOpen(false);
                  setIsEditProgramOpen(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-[#1b3322] pb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedProduct ? `Edit Challenge: ${selectedProduct.name}` : 'Create New Challenge Program'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define account balance, rules, drawdown risk constraints, and pricing
                  </p>
                </div>
              </div>

              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Challenge Name
                    </label>
                    <input
                      type="text"
                      value={programForm.name}
                      onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                      required
                      placeholder="e.g. Rhino Rush ₦10,000,000"
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      SKU Code (Unique)
                    </label>
                    <input
                      type="text"
                      value={programForm.sku}
                      onChange={(e) => setProgramForm({ ...programForm, sku: e.target.value })}
                      required
                      disabled={!!selectedProduct}
                      placeholder="e.g. rhino-rush-10000000"
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Challenge Type
                    </label>
                    <select
                      value={programForm.type}
                      onChange={(e) => setProgramForm({ ...programForm, type: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="ONE_STEP">ONE_STEP (Rhino Rush)</option>
                      <option value="TWO_STEP">TWO_STEP (Elephant)</option>
                      <option value="INSTANT_FUNDING">INSTANT_FUNDING (Phoenix)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Account Capital (₦)
                    </label>
                    <input
                      type="number"
                      value={programForm.accountSize}
                      onChange={(e) => setProgramForm({ ...programForm, accountSize: parseFloat(e.target.value) })}
                      required
                      disabled={!!selectedProduct}
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Entry Fee (₦)
                    </label>
                    <input
                      type="number"
                      value={programForm.priceNgn}
                      onChange={(e) => setProgramForm({ ...programForm, priceNgn: parseFloat(e.target.value) })}
                      required
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-[#00f59b] font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Daily Drawdown (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={programForm.dailyDrawdownPercent}
                      onChange={(e) => setProgramForm({ ...programForm, dailyDrawdownPercent: parseFloat(e.target.value) })}
                      required
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-amber-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Max Drawdown (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={programForm.maxDrawdownPercent}
                      onChange={(e) => setProgramForm({ ...programForm, maxDrawdownPercent: parseFloat(e.target.value) })}
                      required
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-rose-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Profit Target (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={programForm.profitTargetPercent}
                      onChange={(e) => setProgramForm({ ...programForm, profitTargetPercent: parseFloat(e.target.value) })}
                      required
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Leverage
                    </label>
                    <input
                      type="text"
                      value={programForm.leverage}
                      onChange={(e) => setProgramForm({ ...programForm, leverage: e.target.value })}
                      required
                      placeholder="1:100"
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Profit Split
                    </label>
                    <input
                      type="text"
                      value={programForm.profitSplit}
                      onChange={(e) => setProgramForm({ ...programForm, profitSplit: e.target.value })}
                      required
                      placeholder="80:20"
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                      Status
                    </label>
                    <select
                      value={programForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setProgramForm({ ...programForm, isActive: e.target.value === 'true' })}
                      className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="true">Active (Purchasable)</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3322]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateProgramOpen(false);
                      setIsEditProgramOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00f59b] hover:from-emerald-500 hover:to-[#00ffaa] text-black font-heading font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                  >
                    {selectedProduct ? 'Save Rule Changes' : 'Create Program'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: OFFER / GRANT CHALLENGE TO TRADER               */}
        {/* ======================================================== */}
        {isGrantOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0b1612] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
              <button
                onClick={() => setIsGrantOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-[#1b3322] pb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Offer / Grant Challenge to Trader</h3>
                  <p className="text-xs text-slate-400">
                    Direct administrative provisioning of challenge and SteraTrader credentials
                  </p>
                </div>
              </div>

              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleGrantChallenge} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Customer Email Address
                  </label>
                  <input
                    type="email"
                    value={grantUserEmail}
                    onChange={(e) => setGrantUserEmail(e.target.value)}
                    required
                    placeholder="trader@fundedgiants.ng"
                    className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Must be an existing registered FundedGiants customer.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Select Challenge Program Tier
                  </label>
                  <select
                    value={grantProductId}
                    onChange={(e) => setGrantProductId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                        {p.name} ({formatNaira(p.accountSize)}) - Standard Fee: {formatNaira(p.priceNgn)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Grant Privilege / Discount
                  </label>
                  <select
                    value={grantDiscount}
                    onChange={(e) => setGrantDiscount(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="100">100% Free Grant (Promotional / Contest Winner / System Compensation)</option>
                    <option value="50">50% Discount Grant</option>
                    <option value="25">25% Discount Grant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                    Reason / Administrative Note (Recorded in Audit Trail)
                  </label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    required
                    placeholder="e.g. VIP Contest Winner, Tech compensation"
                    className="w-full p-2.5 rounded-lg bg-[#070a08] border border-[#1b3322] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3322]">
                  <button
                    type="button"
                    onClick={() => setIsGrantOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={grantSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-black font-heading font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5"
                  >
                    {grantSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{grantSubmitting ? 'Granting & Provisioning...' : 'Confirm & Grant Challenge'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
