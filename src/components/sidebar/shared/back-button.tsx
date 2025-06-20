import React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/cn';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function BackButton({ onClick, label = "Back", className }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "flex items-center p-2 transition-all duration-200",
        className
      )}
      style={{
        color: 'hsl(var(--muted-foreground))',
        '--tw-ring-color': 'hsl(var(--ring))'
      } as React.CSSProperties}
    >
      <Icons.ChevronLeft 
        className="h-4 w-4" 
        style={{ color: 'hsl(var(--muted-foreground))' }}
      />
    </Button>
  );
} 