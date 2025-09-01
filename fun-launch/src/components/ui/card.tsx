import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-700 bg-neutral-900 p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
