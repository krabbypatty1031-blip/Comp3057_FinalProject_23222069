/**
 * Loading Spinner Component
 * iOS style loading indicator
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  text 
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div 
        className={`
          ${sizeClasses[size]}
          border-2 border-ios-blue/20 border-t-ios-blue 
          rounded-full animate-spin
        `}
      />
      {text && (
        <p className="text-sm text-gray-500 animate-pulse">{text}</p>
      )}
    </div>
  );
};

/**
 * Skeleton Loading Component
 * Skeleton loading effect
 */
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div 
      className={`
        bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
        bg-[length:200%_100%] animate-pulse rounded-lg
        ${className}
      `}
    />
  );
};

export default LoadingSpinner;
