import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  const variantClasses = {
    default: 'bg-neutral-800 text-neutral-200 border border-neutral-700',
    secondary: 'bg-neutral-700 text-neutral-300 border border-neutral-600',
    destructive: 'bg-red-900 text-red-200 border border-red-700',
    outline: 'bg-transparent text-neutral-300 border border-neutral-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
