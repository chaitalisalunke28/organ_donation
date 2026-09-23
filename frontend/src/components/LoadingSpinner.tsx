import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const SIZE_MAP: Record<string, string> = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'md',
  fullPage = false,
}) => {
  const spinnerClass = SIZE_MAP[size] ?? SIZE_MAP.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`rounded-full border-gray-200 border-t-teal-600 animate-spin ${spinnerClass}`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-sm text-gray-500 font-medium animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 w-full">
      {content}
    </div>
  );
};

export default LoadingSpinner;
