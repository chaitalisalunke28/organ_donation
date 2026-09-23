import React from 'react';
import { RefreshCw, CheckCircle2, AlertOctagon, History } from 'lucide-react';
import { RevalidationStatus } from '../types';

interface RevalidationBadgeProps {
  status?: RevalidationStatus | string;
  size?: 'sm' | 'md';
}

export const RevalidationBadge: React.FC<RevalidationBadgeProps> = ({
  status = 'VALID',
  size = 'md',
}) => {
  const getConfig = () => {
    switch (status) {
      case 'REVALIDATION_REQUIRED':
        return {
          bg: 'bg-red-50 border-red-300 text-red-800 animate-pulse',
          icon: AlertOctagon,
          label: 'Revalidation Required',
        };
      case 'REVALIDATED':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          icon: CheckCircle2,
          label: 'Revalidated & Verified',
        };
      case 'SUPERSEDED':
        return {
          bg: 'bg-slate-50 border-slate-300 text-slate-700',
          icon: History,
          label: 'Superseded',
        };
      case 'VALID':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: RefreshCw,
          label: 'Valid State',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${sizeClass} transition-colors shadow-xs`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};
