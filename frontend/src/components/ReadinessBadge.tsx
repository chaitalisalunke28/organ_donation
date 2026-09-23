import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { ReadinessStatus } from '../types';

interface Props {
  status?: ReadinessStatus | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function ReadinessBadge({ status = 'UNKNOWN', score, size = 'sm', showIcon = true }: Props) {
  const st = (status || 'UNKNOWN').toUpperCase();

  let colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
  let Icon = HelpCircle;
  let label = 'Unknown Readiness';

  if (st === 'READY') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    Icon = CheckCircle2;
    label = 'Ready for Surgery';
  } else if (st === 'PARTIALLY_READY') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    Icon = Clock;
    label = 'Partially Ready';
  } else if (st === 'NOT_READY') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
    Icon = AlertTriangle;
    label = 'Not Ready / Bottlenecks';
  }

  const sizeClasses = size === 'sm' ? 'text-3xs px-2 py-0.5' : size === 'lg' ? 'text-xs px-3 py-1.5' : 'text-2xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${colorClasses} ${sizeClasses}`}
      title={score !== undefined ? `${label} (${score}%)` : label}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{label}</span>
      {score !== undefined && <span className="opacity-75">({score}%)</span>}
    </span>
  );
}
