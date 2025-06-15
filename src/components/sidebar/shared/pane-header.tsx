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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BackButton onClick={onBack} />
            {title && (
              <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {title}
              </h2>
            )}
          </div>
          {children && (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 