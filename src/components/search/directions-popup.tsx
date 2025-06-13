"use client";

import React from 'react';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { Button } from '../ui/button';
import { Icons } from '../icons';

export function DirectionsPopup() {
  const dataIntegration = useDataIntegration();
  const { start, destination } = dataIntegration.directions.getDirectionsState();
  const isVisible = !!destination;

  const handleClose = () => {
    dataIntegration.directions.setDirectionsDestination(null);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background p-4 rounded-lg shadow-lg z-20 w-full max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Directions</h3>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <Icons.Close className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <p><strong>From:</strong> {start ? `${start.latitude.toFixed(4)}, ${start.longitude.toFixed(4)}` : 'Current Location'}</p>
        <p><strong>To:</strong> {destination ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : 'N/A'}</p>
      </div>
    </div>
  );
} 