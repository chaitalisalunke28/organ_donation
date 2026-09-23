import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

interface BadgeStyle {
  bg: string;
  text: string;
  dot: string;
  label: string;
}

const STATUS_MAP: Record<string, BadgeStyle> = {
  // Eligibility
  ELIGIBLE: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Eligible',
  },
  NOT_ELIGIBLE: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Not Eligible',
  },

  // Verification / General pending
  PENDING_VERIFICATION: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Pending Verification',
  },
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Pending',
  },

  // Organ availability
  AVAILABLE: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Available',
  },
  OFFERED: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Offered',
  },
  ALLOCATED: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    label: 'Allocated',
  },

  // Completion
  COMPLETED: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Completed',
  },
  UNALLOCATED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    label: 'Unallocated',
  },

  // Active / Inactive
  ACTIVE: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Active',
  },
  INACTIVE: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Inactive',
  },

  // Priority / Urgency
  CRITICAL: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  HIGH: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'High',
  },
  MEDIUM: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Medium',
  },
  LOW: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Low',
  },

  // Offer responses
  ACCEPTED: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Accepted',
  },
  REJECTED: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Rejected',
  },
  EXPIRED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    label: 'Expired',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'In Progress',
  },
};

const DEFAULT_STYLE: BadgeStyle = {
  bg: 'bg-gray-100',
  text: 'text-gray-600',
  dot: 'bg-gray-400',
  label: '',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const normalized = status?.toUpperCase().replace(/ /g, '_');
  const style = STATUS_MAP[normalized] ?? DEFAULT_STYLE;
  const displayLabel = style.label || status;

  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[11px] gap-1';

  const dotSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${style.bg} ${style.text} ${sizeClasses}`}
    >
      <span className={`rounded-full flex-shrink-0 ${style.dot} ${dotSize}`} />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
