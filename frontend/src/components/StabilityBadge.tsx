import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';
import { StabilityTier } from '../types';

interface StabilityBadgeProps {
  tier?: StabilityTier | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const StabilityBadge: React.FC<StabilityBadgeProps> = ({
  tier = 'HIGH',
  score,
  size = 'md',
  showScore = true,
}) => {
  const getBadgeConfig = () => {
    switch (tier) {
      case 'VERY_HIGH':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          icon: ShieldCheck,
          label: 'Very High Stability',
          dot: 'bg-emerald-500',
        };
      case 'HIGH':
        return {
          bg: 'bg-teal-50 border-teal-300 text-teal-800',
          icon: ShieldCheck,
          label: 'High Stability',
          dot: 'bg-teal-500',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          icon: AlertTriangle,
          label: 'Moderate Stability',
          dot: 'bg-amber-500',
        };
      case 'LOW':
        return {
          bg: 'bg-orange-50 border-orange-300 text-orange-800',
          icon: ShieldAlert,
          label: 'Low Stability',
          dot: 'bg-orange-500',
        };
      case 'CRITICAL_FRAGILITY':
      default:
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-800',
          icon: ShieldX,
          label: 'Critical Fragility',
          dot: 'bg-rose-500 animate-pulse',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${sizeClasses} transition-colors shadow-xs`}
      title={`Match Stability: ${config.label}${score !== undefined ? ` (${score}%)` : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="font-bold opacity-90 pl-0.5">({score}%)</span>
      )}
    </span>
  );
};
