import React from 'react';
import { Link } from 'react-router-dom';

export type StatTone = 'brand' | 'green' | 'amber' | 'violet' | 'rose' | 'sky';

const TONES: Record<StatTone, string> = {
  brand: 'text-teal-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  violet: 'text-violet-600',
  rose: 'text-rose-500',
  sky: 'text-sky-600',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  footer?: React.ReactNode;
  to?: string;
}

export default function StatCard({ label, value, icon, tone = 'brand', footer, to }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
        <span className={`shrink-0 ${TONES[tone]}`}>{icon}</span>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
      {footer && <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">{footer}</div>}
    </>
  );

  return to ? (
    <Link to={to} className="stat-card block hover:border-gray-300">
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}
