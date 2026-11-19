'use client';

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Award,
  Download,
  Calendar,
  Maximize2,
  X
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

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    async function loadCertificates() {
      try {
        const res = await fetch(`${API_BASE_URL}/certificates`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCertificates(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch certificates from API:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCertificates();
  }, [apiUrl]);

  const filteredCerts = certificates.filter((cert) => {
    if (filter === 'ALL') return true;
    return cert.type === filter;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 pb-16 space-y-8">
      {/* Header with Professional Breadcrumb & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20">
              <Award className="h-5 w-5 text-[#10B981]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Official Certificates</h1>
          </div>
          <p className="text-xs text-gray-400">
            Download high-resolution certificates and publicly verify accredited milestones on the official ledger.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 bg-[#091016] p-1 rounded-xl border border-white/[0.08] self-start md:self-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'ALL'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({certificates.length})
          </button>
          <button
            onClick={() => setFilter('COMPLETION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'COMPLETION'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Milestone Pass
          </button>
          <button
            onClick={() => setFilter('PAYOUT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === 'PAYOUT'
                ? 'bg-[#10B981] text-[#060B11] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Payout Awards
          </button>
        </div>
      </div>

      {/* Grid of Certificates - 3 Columns on Desktop */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-[#091016]/60 border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="text-center py-16 bg-[#091016]/40 rounded-2xl border border-white/[0.06]">
          <Award className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Certificates Issued Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
            Pass a Rhino Rush Challenge or receive an approved payout to unlock accredited certificates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-6">
          {filteredCerts.map((cert) => {
            const isPayout = cert.type === 'PAYOUT';
            return (
              <div
                key={cert.id}
                className="group relative bg-[#091218] hover:bg-[#0b161e] rounded-2xl border border-white/[0.08] hover:border-[#10B981]/50 transition-all duration-300 flex flex-col shadow-lg hover:shadow-[#10B981]/5 overflow-hidden"
              >
                {/* Compact Card Header */}
                <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-white/[0.04]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isPayout
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                        }`}
                      >
                        {isPayout ? 'Disbursement' : 'Milestone Pass'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 truncate">
                        {cert.id}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors truncate">
                      {cert.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedPreview(cert)}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors shrink-0"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Scaled Preview Image */}
                <div
                  onClick={() => setSelectedPreview(cert)}
                  className="relative aspect-[1024/723] w-full bg-[#03070a] overflow-hidden cursor-pointer"
                >
                  <Image
                    src={cert.certificateUrl}
                    alt={cert.title}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg bg-[#060B11]/90 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/20 shadow-2xl backdrop-blur-sm">
                      <Maximize2 className="h-3 w-3 text-[#10B981]" /> Zoom Preview
                    </span>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="p-4 bg-[#070e13]/80 flex-1 flex flex-col justify-between gap-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Recipient</span>
                      <span className="font-semibold text-white truncate block">{cert.recipientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Issued</span>
                      <span className="font-semibold text-white flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 text-gray-400" />
                        {cert.issueDate}
                      </span>
                    </div>
                    {isPayout && cert.amount ? (
                      <div className="col-span-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-gray-500 text-[10px]">Profit Split</span>
                        <span className="font-bold text-[#10B981] text-xs">
                          ₦{cert.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <div className="col-span-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-gray-500 text-[10px]">Account</span>
                        <span className="font-semibold text-white text-xs">{cert.accountNumber || 'FG-Standard'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/[0.04]">
                    <a
                      href={cert.certificateUrl}
                      download={`${cert.id}.jpg`}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-[#060B11] font-bold text-xs transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download High-Res JPEG
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#070e14] border border-white/[0.15] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
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
              <div className="relative aspect-[1024/723] w-full max-h-[75vh]">
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
