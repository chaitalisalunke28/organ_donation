import React from 'react';
import { Link } from 'react-router-dom';

export type StatTone = 'brand' | 'green' | 'amber' | 'violet' | 'rose' | 'sky';

const TONES: Record<StatTone, string> = {
  brand: 'bg-teal-50 text-teal-600 ring-teal-600/10',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  violet: 'bg-violet-50 text-violet-600 ring-violet-600/10',
  rose: 'bg-rose-50 text-rose-600 ring-rose-600/10',
  sky: 'bg-sky-50 text-sky-600 ring-sky-600/10',
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
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONES[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-gray-950">{value}</p>
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
