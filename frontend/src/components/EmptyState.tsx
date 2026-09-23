import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon container */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-5">
        {icon ?? <Inbox size={28} />}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>

      {/* Message */}
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">{message}</p>

      {/* Optional action button */}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
