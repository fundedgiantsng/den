import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  | 'APPROVED'
  | 'ACTIVE'
  | 'PASSED'
  | 'PAID'
  | 'SUCCESSFUL'
  | 'PENDING'
  | 'PENDING_REVIEW'
  | 'REQUESTED'
  | 'PROVISIONING'
  | 'FAILED'
  | 'CLOSED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'CRITICAL'
  | 'WARNING'
  | 'UNVERIFIED';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase() as BadgeVariant;

  const getStyle = () => {
    switch (norm) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'PASSED':
      case 'PAID':
      case 'SUCCESSFUL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
      case 'PENDING_REVIEW':
      case 'REQUESTED':
      case 'PROVISIONING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'FAILED':
      case 'CLOSED':
      case 'SUSPENDED':
      case 'REJECTED':
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'WARNING':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
        getStyle(),
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
