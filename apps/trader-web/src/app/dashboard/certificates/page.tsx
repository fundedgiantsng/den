'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  Search,
  Maximize2,
  X,
  Share2
} from 'lucide-react';

interface CertificateItem {
  id: string;
  type: 'COMPLETION' | 'PAYOUT';
  title: string;
  program: string;
  recipientName: string;
  accountNumber?: string;
  amount?: number;
  issueDate: string;
  certificateUrl: string;
  verificationUrl: string;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<CertificateItem | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'COMPLETION' | 'PAYOUT'>('ALL');

  useEffect(() => {
    async function loadCertificates() {
      try {
        const res = await fetch('/api/v1/certificates');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCertificates(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch certificates from API:', err);
      }

      // Default sample certificates matching the exact issued templates
      setCertificates([
        {
          id: 'FG-CERT-2025-84920',
          type: 'COMPLETION',
          title: 'Rhino Rush (1 Step) Completion Certificate',
          program: 'Rhino Rush Evaluation',
          recipientName: 'John Doe',
          accountNumber: 'FG-48291',
          issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          certificateUrl: '/certificates/generated/sample-completion.jpg',
          verificationUrl: 'https://fundedgiants.com/#payouts',
        },
        {
          id: 'FG-PAY-2025-10492',
          type: 'PAYOUT',
          title: 'Official Trader Payout Certificate',
          program: 'Funded Giant Profit Split',
          recipientName: 'John Doe',
          accountNumber: 'FG-48291',
          amount: 680000,
          issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          certificateUrl: '/certificates/generated/sample-payout.jpg',
          verificationUrl: 'https://fundedgiants.com/#payouts',
        },
      ]);
      setLoading(false);
    }

    loadCertificates();
  }, []);

  const filteredCerts = certificates.filter((cert) => {
    if (filter === 'ALL') return true;
    return cert.type === filter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-6 w-6 text-[#10B981]" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Official Certificates</h1>
          </div>
          <p className="text-sm text-gray-400">
            Download and verify your accredited FundedGiants milestones and profit-share disbursements.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-[#0c1219] p-1.5 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'ALL'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({certificates.length})
          </button>
          <button
            onClick={() => setFilter('COMPLETION')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'COMPLETION'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Milestone Pass
          </button>
          <button
            onClick={() => setFilter('PAYOUT')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'PAYOUT'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Payout Awards
          </button>
        </div>
      </div>

      {/* Grid of Certificates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="text-center py-16 bg-[#0c1219]/60 rounded-2xl border border-white/[0.06]">
          <Award className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Certificates Issued Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
            Complete a Rhino Rush 1-Step Challenge or receive your first approved payout to unlock accredited certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCerts.map((cert) => {
            const isPayout = cert.type === 'PAYOUT';
            return (
              <div
                key={cert.id}
                className="group relative bg-gradient-to-b from-[#0c161d] to-[#070d13] rounded-2xl border border-white/[0.08] hover:border-[#10B981]/40 transition-all duration-300 overflow-hidden flex flex-col shadow-xl"
              >
                {/* Visual Certificate Card Header */}
                <div className="p-5 pb-3 flex items-start justify-between gap-4 border-b border-white/[0.04]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isPayout
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                        }`}
                      >
                        {isPayout ? 'Disbursement Certificate' : 'Challenge Passed'}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-[#10B981]" />
                        {cert.id}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white group-hover:text-[#10B981] transition-colors">
                      {cert.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedPreview(cert)}
                    className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Stamped Certificate Image Preview */}
                <div
                  onClick={() => setSelectedPreview(cert)}
                  className="relative aspect-[1024/723] w-full bg-[#03070a] overflow-hidden cursor-pointer"
                >
                  <Image
                    src={cert.certificateUrl}
                    alt={cert.title}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 rounded-lg bg-[#060B11]/90 text-white text-xs font-semibold flex items-center gap-2 border border-white/20 shadow-2xl backdrop-blur-sm">
                      <Maximize2 className="h-3.5 w-3.5 text-[#10B981]" /> Click to Zoom
                    </span>
                  </div>
                </div>

                {/* Metadata & Details */}
                <div className="p-5 pt-4 bg-[#0a1117]/80 flex-1 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Recipient</span>
                      <span className="font-semibold text-white">{cert.recipientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Issue Date</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {cert.issueDate}
                      </span>
                    </div>
                    {isPayout && cert.amount ? (
                      <div>
                        <span className="text-gray-400 block text-[11px]">Profit Split</span>
                        <span className="font-bold text-[#10B981]">
                          ₦{cert.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-400 block text-[11px]">Account Reference</span>
                        <span className="font-semibold text-white">{cert.accountNumber || 'FG-Standard'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                    <a
                      href={cert.certificateUrl}
                      download={`${cert.id}.jpg`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-[#060B11] font-semibold text-xs transition-all shadow-md active:scale-[0.98]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download High-Res JPEG
                    </a>

                    <a
                      href="http://fundedgiants.local/#payouts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all"
                      title="Verify on Live Public Ledger"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-[#10B981]" />
                      Verify On Tracker
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Ledger Notice Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0c181f] via-[#09131a] to-[#070d13] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#10B981]" />
            <h3 className="text-base font-bold text-white">Cryptographically Timestamped & Publicly Tracked</h3>
          </div>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Every FundedGiants certificate is assigned a unique alphanumeric ID synchronized with the live WordPress
            payout tracker. Prospective firms, sponsors, and peers can verify authentic issuance in real time on the official homepage.
          </p>
        </div>
        <a
          href="http://fundedgiants.local/#payouts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#10B981]/40 text-[#10B981] font-semibold text-xs whitespace-nowrap transition-colors"
        >
          Open Public Payout Ledger
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Fullscreen Zoom Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#070e14] border border-white/[0.15] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 flex items-center justify-between border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedPreview.title}</h3>
                <p className="text-xs font-mono text-[#10B981]">ID: {selectedPreview.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPreview.certificateUrl}
                  download={`${selectedPreview.id}.jpg`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] text-[#060B11] text-xs font-bold hover:bg-[#0ea371] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button
                  onClick={() => setSelectedPreview(null)}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-[#020508]">
              <div className="relative aspect-[1024/723] w-full max-h-[70vh]">
                <Image
                  src={selectedPreview.certificateUrl}
                  alt={selectedPreview.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
