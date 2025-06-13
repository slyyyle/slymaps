import React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Coordinates } from '@/types/core';

interface SearchActionsProps {
  showNearbyTransit: boolean;
  currentLocation?: Coordinates;
  currentQuery: string;
  externalValue?: string;
  onNearbyTransit: () => void;
  onClear: () => void;
}

export function SearchActions({
  showNearbyTransit,
  currentLocation,
  currentQuery,
  externalValue,
  onNearbyTransit,
  onClear,
}: SearchActionsProps) {
  return (
    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 z-10">
      {showNearbyTransit && currentLocation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNearbyTransit}
          className="h-7 w-7 p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          style={{
            color: 'hsl(var(--sidebar-foreground) / 0.7)',
          }}
          title="Find nearby transit"
        >
          <Icons.Navigation className="h-3 w-3" />
        </Button>
      )}
      {(currentQuery || externalValue) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 w-7 p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          style={{
            color: 'hsl(var(--sidebar-foreground) / 0.7)',
          }}
          title="Clear search"
        >
          <Icons.Close className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
} 