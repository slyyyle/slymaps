"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';

interface FindRouteByIdProps {
  onSelectRoute: (routeId: string) => void;
  isBusy: boolean;
}

export function FindRouteById({ 
  onSelectRoute,
  isBusy,
}: FindRouteByIdProps) {
  const [routeIdQuery, setRouteIdQuery] = useState('');

  const handleRouteSearch = () => {
    if (routeIdQuery.trim()) {
      onSelectRoute(routeIdQuery.trim());
    }
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <p className="text-sm text-muted-foreground">
        Enter a OneBusAway Route ID (e.g., 1_100208 for KCM Route 40) to see its path and stops. This is for advanced use or debugging.
      </p>
      
      <div className="space-y-2 overflow-hidden">
        <Label htmlFor="route-id-search">OBA Route ID</Label>
        <div className="flex space-x-2 w-full overflow-hidden">
          <Input 
            id="route-id-search"
            placeholder="e.g., 1_100208"
            value={routeIdQuery}
            onChange={(e) => setRouteIdQuery(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleRouteSearch(); }}
            className="flex-1 min-w-0"
          />
          <Button 
            onClick={handleRouteSearch} 
            disabled={isBusy || !routeIdQuery.trim()}
            className="shrink-0"
          >
            {isBusy && routeIdQuery ? (
              <Icons.Time className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Route className="mr-2 h-4 w-4" />
            )}
            Show Path
          </Button>
        </div>
      </div>
    </div>
  );
} 