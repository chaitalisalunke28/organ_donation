import React from 'react';
import { UserCheck, PauseCircle, Ban, HeartHandshake, UserX, HelpCircle } from 'lucide-react';
import { CandidateStatus } from '../types';

interface Props {
  status?: CandidateStatus | string;
  size?: 'sm' | 'md';
}

export default function CandidateStatusBadge({ status = 'ACTIVE', size = 'sm' }: Props) {
  const st = (status || 'ACTIVE').toUpperCase();

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = UserCheck;
  let label = 'Active on List';

  if (st === 'INACTIVE') {
    colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
    Icon = PauseCircle;
    label = 'Inactive';
  } else if (st === 'TEMPORARILY_UNAVAILABLE') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = PauseCircle;
    label = 'Temp Unavailable (Medical)';
  } else if (st === 'WITHDRAWN') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = Ban;
    label = 'Withdrawn';
  } else if (st === 'TRANSPLANTED') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    Icon = HeartHandshake;
    label = 'Transplanted';
  } else if (st === 'DECEASED') {
    colorClasses = 'bg-gray-200 text-gray-800 border-gray-300';
    Icon = UserX;
    label = 'Deceased';
  }

  const sizeClasses = size === 'sm' ? 'text-3xs px-2 py-0.5' : 'text-2xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-semibold ${colorClasses} ${sizeClasses}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}
