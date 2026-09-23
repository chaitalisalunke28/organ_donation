import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';
import { RiskTier } from '../types';

interface Props {
  tier?: RiskTier | string;
  probability?: number;
  percentage?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({ tier = 'LOW_RISK', probability, percentage, size = 'sm' }: Props) {
  const t = (tier || 'LOW_RISK').toUpperCase();
  const pct = percentage !== undefined ? percentage : probability !== undefined ? Math.round(probability * 100) : null;

  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
  let Icon = ShieldCheck;
  let label = 'Low Operational Risk';

  if (t === 'MODERATE_RISK') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    Icon = ShieldAlert;
    label = 'Moderate Risk';
  } else if (t === 'HIGH_RISK') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
    Icon = AlertOctagon;
    label = 'High Risk';
  }

  const sizeClasses = size === 'sm' ? 'text-3xs px-2 py-0.5' : size === 'lg' ? 'text-xs px-3 py-1.5' : 'text-2xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${colorClasses} ${sizeClasses}`}
      title={pct !== null ? `${label} (${pct}%)` : label}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
      {pct !== null && <span className="font-mono">({pct}%)</span>}
    </span>
  );
}
