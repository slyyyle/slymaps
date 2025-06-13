import React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { PaneType } from './sidebar-shell';

interface MainMenuProps {
  onPaneSelect: (pane: PaneType) => void;
  className?: string;
}

const menuItems = [
  {
    id: 'home' as const,
    label: 'Home',
    icon: 'Home',
    description: 'Set and view your home address'
  },
  {
    id: 'directions' as const,
    label: 'Directions',
    icon: 'Navigation',
    description: 'Get turn-by-turn directions'
  },
  {
    id: 'transit' as const,
    label: 'Transit',
    icon: 'Bus',
    description: 'Find buses, trains & stops'
  },
  {
    id: 'style' as const,
    label: 'Style',
    icon: 'Palette',
    description: 'Change map appearance'
  }
];

export function MainMenu({ onPaneSelect, className }: MainMenuProps) {
  return (
    <div className={cn("flex flex-col p-4 space-y-3", className)}>
      <div className="space-y-2">
        {menuItems.map((item) => {
          const IconComponent = Icons[item.icon as keyof typeof Icons] || Icons.Circle;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start h-auto p-4 text-left transition-all duration-200"
              onClick={() => onPaneSelect(item.id)}
              style={{
                '--tw-ring-color': 'hsl(var(--ring))'
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  <IconComponent 
                    className="h-5 w-5" 
                    style={{ color: 'hsl(var(--foreground))' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div 
                    className="font-medium text-sm"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {item.label}
                  </div>
                  <div 
                    className="text-xs truncate"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {item.description}
                  </div>
                </div>
                <Icons.ChevronRight 
                  className="h-4 w-4 flex-shrink-0" 
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                />
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
} 