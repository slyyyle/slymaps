"use client";

import React from 'react';
import type { PointOfInterest, ObaArrivalDeparture, ObaRoute } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { isValidApiKey } from '@/lib/error-utils';
import { formatObaTime, getStatusColor } from '@/lib/time-utils';

interface StopInformationProps {
  apiKey: string;
  selectedPoi: PointOfInterest | null;
  arrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRoute: (routeId: string) => void;
  isBusy: boolean;
  obaReferencedRoutes: Record<string, ObaRoute>;
}

export function StopInformation({ 
  apiKey, 
  selectedPoi, 
  arrivals, 
  isLoadingArrivals, 
  onSelectRoute, 
  isBusy,
  obaReferencedRoutes,
}: StopInformationProps) {

  if (!isValidApiKey(apiKey)) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10">
        <div className="flex items-center text-destructive mb-2">
          <Icons.Info className="mr-2 h-5 w-5" />
          <span className="font-semibold">Configuration Needed</span>
        </div>
        <p className="text-sm text-muted-foreground">
          OneBusAway API key is missing or invalid. Please set the 
          <code className="mx-1 p-1 bg-muted rounded text-xs">NEXT_PUBLIC_ONEBUSAWAY_API_KEY</code>
          environment variable to enable real-time transit features.
        </p>
      </div>
    );
  }

  const currentObaStop = selectedPoi && selectedPoi.isObaStop ? selectedPoi : null;

  const getRouteShortName = (routeId: string): string => {
    const refRoute = obaReferencedRoutes[routeId];
    if (refRoute && refRoute.shortName) {
      return refRoute.shortName;
    }
    return routeId.includes('_') ? routeId.split('_')[1] : routeId;
  };
  
  const getRouteDescription = (routeId: string): string | undefined => {
    const refRoute = obaReferencedRoutes[routeId];
    return refRoute?.description || refRoute?.longName;
  };

  if (!currentObaStop) {
    return (
      <div className="text-center py-8">
        <Icons.MapPin className="inline-block mr-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Select a bus stop on the map to view its details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-tight break-words">
          <strong>Stop #{currentObaStop.code}:</strong> {currentObaStop.name} {currentObaStop.direction ? `(${currentObaStop.direction} bound)` : ''}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1.5">Routes Serving This Stop:</h4>
        {currentObaStop.routeIds && currentObaStop.routeIds.length > 0 ? (
          <ScrollArea className="h-[100px] pr-2">
            <ul className="space-y-1.5">
              {currentObaStop.routeIds.map(routeId => (
                <li key={routeId}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                    onClick={() => onSelectRoute(routeId)}
                    disabled={isBusy}
                    title={`Show path for route ${getRouteShortName(routeId)}`}
                  >
                    <div className="flex items-start gap-2 w-full min-w-0">
                      <Badge variant="secondary" className="text-xs px-1.5 py-1 min-w-[2rem] max-w-[2.5rem] text-center shrink-0 truncate">
                        {getRouteShortName(routeId)}
                      </Badge>
                      <span className="flex-1 min-w-0 text-sm leading-tight break-words">{getRouteDescription(routeId) || `Route ${getRouteShortName(routeId)}`}</span>
                      <Icons.Next className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground">No routes listed for this stop.</p>
        )}
      </div>

      <Separator className="my-3" />

      <div>
        <h4 className="text-sm font-semibold mb-1.5">Real-Time Arrivals:</h4>
        {isLoadingArrivals ? (
          <div className="space-y-3 mt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-12 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : arrivals.length > 0 ? (
          <ScrollArea className="h-[150px] pr-2">
            <ul className="space-y-2.5">
              {arrivals.map((arrival, index) => (
                <li key={`${arrival.tripId}-${arrival.scheduledArrivalTime}-${index}`} className="p-2 rounded-md border bg-card/50">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-bold shrink-0"
                        onClick={() => onSelectRoute(arrival.routeId)}
                        disabled={isBusy}
                        title={`Show path for route ${arrival.routeShortName}`}
                      >
                        <Badge variant="secondary" className="font-bold text-xs px-1.5 py-1 min-w-[2rem] max-w-[2.5rem] text-center hover:bg-primary/20">
                          {arrival.routeShortName}
                        </Badge>
                      </Button>
                      <span className="font-medium text-sm leading-tight break-words flex-1 min-w-0" title={arrival.tripHeadsign}>
                        {arrival.tripHeadsign}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {arrival.status && (
                        <span 
                          className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusColor(arrival.status)}`} 
                          title={`Status: ${arrival.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`}
                        ></span>
                      )}
                      {arrival.predictedArrivalTime ? (
                        <span className="font-semibold text-sm text-accent">{formatObaTime(arrival.predictedArrivalTime)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{formatObaTime(arrival.scheduledArrivalTime)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {arrival.predictedArrivalTime && arrival.predictedArrivalTime !== arrival.scheduledArrivalTime && (
                      <p className="leading-tight break-words">Scheduled: {formatObaTime(arrival.scheduledArrivalTime)}</p>
                    )}
                    {arrival.status && <p className="leading-tight break-words">Status: {arrival.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>}
                    {arrival.vehicleId && <p className="leading-tight break-words">Vehicle: {arrival.vehicleId}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <div className="text-center py-4">
            <Icons.Info className="inline-block mr-2 h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No upcoming arrivals or data unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 