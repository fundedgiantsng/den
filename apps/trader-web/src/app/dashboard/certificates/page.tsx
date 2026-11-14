'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Plus,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { formatNaira } from '@/lib/format';

interface Certificate {
  id: string;
  certificateNumber: string;
  type: 'EVALUATION_PASSED' | 'FUNDED_TRADER' | 'ELITE_PAYOUT';
  title: string;
  subtitle: string;
  recipientName: string;
  accountNumber: string;
  planName: string;
  capitalSizeNgn: number;
  issueDate: string;
  verificationHash: string;
}

export default function CertificatesPage() {
  const [filter, setFilter] = useState<'ALL' | 'EVALUATION' | 'FUNDED' | 'PAYOUT'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const certificates: Certificate[] = [
    {
      id: 'cert-01',
      certificateNumber: 'FG-CERT-48291-PASS',
      type: 'EVALUATION_PASSED',
      title: 'EVALUATION PASSED',
      subtitle: 'PROUDLY PRESENTED TO',
      recipientName: 'John Doe',
      accountNumber: 'FG-48291',
      planName: 'Rhino Rush 1-Step',
      capitalSizeNgn: 10000000,
      issueDate: 'October 24, 2026',
      verificationHash: '0x8f2d4e1b7c9a3d5e2a4f6c8e0b1d3f5a7c9e',
    },
    {
      id: 'cert-02',
      certificateNumber: 'FG-CERT-48291-FND',
      type: 'FUNDED_TRADER',
      title: 'OFFICIAL FUNDED TRADER',
      subtitle: 'PROUDLY PRESENTED TO',
      recipientName: 'John Doe',
      accountNumber: 'FG-48291',
      planName: 'Rhino Rush Funded',
      capitalSizeNgn: 10000000,
      issueDate: 'October 25, 2026',
      verificationHash: '0x4a7c9e1b2d3f5a8f2d4e1b7c9a3d5e2a4f6c',
    },
    {
      id: 'cert-03',
      certificateNumber: 'FG-CERT-60194-FND',
      type: 'FUNDED_TRADER',
      title: 'OFFICIAL FUNDED TRADER',
      subtitle: 'PROUDLY PRESENTED TO',
      recipientName: 'John Doe',
      accountNumber: 'FG-60194',
      planName: 'Phoenix Rise Instant',
      capitalSizeNgn: 25000000,
      issueDate: 'November 02, 2026',
      verificationHash: '0x1b7c9a3d5e2a4f6c8e0b1d3f5a7c9e4a7c9e',
    },
  ];

  const filtered = certificates.filter((c) => {
    if (filter === 'EVALUATION') return c.type === 'EVALUATION_PASSED';
    if (filter === 'FUNDED') return c.type === 'FUNDED_TRADER';
    if (filter === 'PAYOUT') return c.type === 'ELITE_PAYOUT';
    return true;
  });

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(`https://verify.fundedgiants.com/cert/${hash}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleDownload = (cert: Certificate) => {
    // Print window for saving PDF
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-[#00f59b]" />
            <span>Certificates of Achievement</span>
          </h1>
          <p className="text-xs sm:text-sm text-fgText-secondary mt-1">
            Official cryptographically verifiable certificates earned through discipline and funded excellence.
          </p>
        </div>

        <Link
          href="/dashboard/challenges/buy"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#e0961f] text-black font-heading font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Buy New Account</span>
        </Link>
      </div>

      {/* 2. Top Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Award className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Total Issued</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white">
            {certificates.length}
          </div>
        </div>

        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Funded Allocations</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#00f59b]">
            {formatNaira(35000000)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium text-fgText-secondary">Verification Status</span>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Cryptographically Verified</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-semibold overflow-x-auto w-fit">
        {(['ALL', 'EVALUATION', 'FUNDED', 'PAYOUT'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap capitalize ${
              filter === tab
                ? 'bg-[#00e575] text-black font-extrabold'
                : 'text-fgText-secondary hover:text-white'
            }`}
          >
            {tab === 'ALL' ? 'All Certificates' : tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* 4. Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 rounded-2xl bg-[#09120e] border border-white/[0.08] text-center text-xs text-fgText-muted">
            No certificates found in this category.
          </div>
        ) : (
          filtered.map((cert) => (
            <div
              key={cert.id}
              className="rounded-2xl bg-[#09120e] border border-white/[0.08] p-5 space-y-4 hover:border-emerald-500/40 transition-all shadow-xl group flex flex-col justify-between"
            >
              {/* Prestigious Certificate Header */}
              <div className="space-y-3">
                {/* Certificate Frame Preview */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#07130d] via-[#040d08] to-[#010503] border-2 border-emerald-500/30 p-5 text-center space-y-3 shadow-inner">
                  {/* Subtle Geometric Background */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00f59b_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

                  {/* Top Seal & Brand */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-emerald-400/80 tracking-widest uppercase">
                      FUNDEDGIANTS OFFICIAL
                    </span>
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Certificate Title */}
                  <div className="relative z-10 space-y-0.5 pt-1">
                    <div className="text-[10px] font-mono tracking-widest text-[#f5a623] font-extrabold uppercase">
                      {cert.title}
                    </div>
                    <div className="text-[8px] font-mono text-fgText-muted tracking-wider uppercase">
                      {cert.subtitle}
                    </div>
                    <div className="text-base font-heading font-extrabold text-white tracking-tight">
                      {cert.recipientName}
                    </div>
                  </div>

                  {/* Account & Allocation Badge */}
                  <div className="relative z-10 py-1.5 px-3 rounded-lg bg-black/50 border border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-fgText-secondary">{cert.planName}</span>
                    <span className="font-bold text-[#00f59b]">{formatNaira(cert.capitalSizeNgn)}</span>
                  </div>

                  {/* Issue Date & Certificate ID */}
                  <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-fgText-muted border-t border-white/[0.06] pt-2">
                    <span>Issued: {cert.issueDate}</span>
                    <span className="font-bold text-white">{cert.accountNumber}</span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-fgText-secondary">Certificate ID:</span>
                    <span className="text-white font-bold">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-fgText-secondary">Allocation:</span>
                    <span className="text-emerald-400 font-bold">{formatNaira(cert.capitalSizeNgn)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={() => handleDownload(cert)}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Certificate</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyHash(cert.verificationHash, cert.id)}
                  className="w-full py-1.5 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.06] text-fgText-secondary hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
                >
                  {copiedId === cert.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Verification Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Verification Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
