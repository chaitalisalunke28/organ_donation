import React from 'react';
import { Heart, Droplets, Wind, Zap, Eye, Circle, Activity } from 'lucide-react';

interface OrganBadgeProps {
  organ: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

interface OrganStyle {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
  label: string;
}

const ICON_SIZE_MAP: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

const getOrganStyle = (organ: string, iconSize: number): OrganStyle => {
  const normalized = organ?.toUpperCase();

  switch (normalized) {
    case 'KIDNEY':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: <Droplets size={iconSize} />,
        label: 'Kidney',
      };
    case 'LIVER':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: <Activity size={iconSize} />,
        label: 'Liver',
      };
    case 'HEART':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: <Heart size={iconSize} />,
        label: 'Heart',
      };
    case 'LUNG':
    case 'LUNGS':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        icon: <Wind size={iconSize} />,
        label: organ?.toUpperCase() === 'LUNGS' ? 'Lungs' : 'Lung',
      };
    case 'PANCREAS':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: <Zap size={iconSize} />,
        label: 'Pancreas',
      };
    case 'CORNEA':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        icon: <Eye size={iconSize} />,
        label: 'Cornea',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        icon: <Circle size={iconSize} />,
        label: organ ? organ.charAt(0).toUpperCase() + organ.slice(1).toLowerCase() : 'Other',
      };
  }
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const OrganBadge: React.FC<OrganBadgeProps> = ({ organ, size = 'sm', showLabel = true }) => {
  const iconSize = ICON_SIZE_MAP[size] ?? 12;
  const style = getOrganStyle(organ, iconSize);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}
    >
      <span className="flex-shrink-0">{style.icon}</span>
      {showLabel && <span>{style.label}</span>}
    </span>
  );
};

export default OrganBadge;
