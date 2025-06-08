"use client";

import React from 'react';
import type { PointOfInterest, Coordinates, CurrentOBARouteDisplayData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface RouteDetailsProps {
  currentOBARouteDisplayData: CurrentOBARouteDisplayData;
  onSelectPoiFromList: (poi: PointOfInterest) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
}

export function RouteDetails({ 
  currentOBARouteDisplayData,
  onSelectPoiFromList,
  onFlyTo,
}: RouteDetailsProps) {

  return (
    <div className="space-y-4 flex flex-col">
      <div className="space-y-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground leading-tight break-words">
          {currentOBARouteDisplayData.routeInfo.description || currentOBARouteDisplayData.routeInfo.longName || `Details for Route ${currentOBARouteDisplayData.routeInfo.shortName}`}
        </p>
        {currentOBARouteDisplayData.routeInfo.agency?.name && (
          <p className="text-xs text-muted-foreground leading-tight break-words">
            <strong>Agency:</strong> {currentOBARouteDisplayData.routeInfo.agency.name}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <h4 className="text-sm font-semibold mb-2">Stops ({currentOBARouteDisplayData.stops.length}):</h4>
        {currentOBARouteDisplayData.stops.length > 0 ? (
          <ScrollArea className="h-[300px] pr-2">
            <ul className="space-y-1.5">
              {currentOBARouteDisplayData.stops.map((stop) => (
                <li key={stop.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                    onClick={() => {
                      onSelectPoiFromList(stop);
                      onFlyTo({ latitude: stop.latitude, longitude: stop.longitude }, 16);
                    }}
                    title={`Select stop: ${stop.name}`}
                  >
                    <div className="flex items-start w-full min-w-0">
                      <Icons.Bus className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-3 mt-0.5" />
                      <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight break-words">{stop.name}</p>
                      <p className="text-xs text-muted-foreground leading-tight break-words">ID: {stop.code} {stop.direction ? `- ${stop.direction} bound` : ''}</p>
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2 mt-0.5" />
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No stops found for this route.</p>
        )}
      </div>
    </div>
  );
} 