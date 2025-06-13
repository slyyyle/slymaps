import React from 'react';
import { cn } from '@/lib/cn';
import { BackButton } from './back-button';

interface PaneHeaderProps {
  title: string;
  onBack: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function PaneHeader({ title, onBack, className, children }: PaneHeaderProps) {
  return (
    <div 
      className={cn(
        "flex-shrink-0",
        className
      )}
      style={{
        borderBottom: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--background))'
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2">
          <BackButton onClick={onBack} />
        </div>
      </div>
    </div>
  );
} 