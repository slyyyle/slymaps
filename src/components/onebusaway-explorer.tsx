
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import type { PointOfInterest, CustomPOI, ObaArrivalDeparture } from '@/types';

interface OneBusAwayExplorerProps {
  apiKey: string;
  selectedPoi: PointOfInterest | CustomPOI | null;
  arrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
}

const formatObaTime = (epochTime: number | null | undefined): string => {
  if (!epochTime) return 'N/A';
  return new Date(epochTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getStatusColor = (status?: string) => {
  if (!status) return "bg-gray-500"; // Default for unknown status
  if (status.toLowerCase().includes("scheduled") || status.toLowerCase().includes("on time")) return "bg-green-500";
  if (status.toLowerCase().includes("delayed")) return "bg-orange-500";
  if (status.toLowerCase().includes("canceled")) return "bg-red-500";
  return "bg-yellow-500"; // For 'early' or other statuses like 'no data', etc.
};


export function OneBusAwayExplorer({ apiKey, selectedPoi, arrivals, isLoadingArrivals }: OneBusAwayExplorerProps) {
  if (!apiKey || apiKey === "YOUR_ONEBUSAWAY_API_KEY_HERE" || apiKey === "") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Icons.Info className="mr-2 h-5 w-5" /> Configuration Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            OneBusAway API key is missing or invalid. Please set the 
            <code className="mx-1 p-1 bg-muted rounded text-xs">NEXT_PUBLIC_ONEBUSAWAY_API_KEY</code>
            environment variable to enable real-time transit features.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentObaStop = selectedPoi && selectedPoi.isObaStop ? selectedPoi : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.Bus className="mr-2 h-5 w-5 text-primary" /> Real-Time Arrivals
        </CardTitle>
        {currentObaStop ? (
          <CardDescription>
            Displaying arrivals for Stop #{currentObaStop.code} - {currentObaStop.name} ({currentObaStop.direction} bound)
          </CardDescription>
        ) : (
          <CardDescription>
            Select a bus stop on the map to view its live arrival times.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!currentObaStop && (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Icons.MapPin className="inline-block mr-2 h-4 w-4" />
            No bus stop selected.
          </p>
        )}
        {currentObaStop && isLoadingArrivals && (
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
        )}
        {currentObaStop && !isLoadingArrivals && arrivals.length > 0 && (
          <ScrollArea className="h-[250px] pr-2">
            <ul className="space-y-2.5">
              {arrivals.map((arrival, index) => (
                <li key={`${arrival.tripId}-${arrival.scheduledArrivalTime}-${index}`} className="p-2 rounded-md border bg-card/50">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-bold text-base px-2 py-1 w-16 text-center">
                        {arrival.routeShortName}
                      </Badge>
                      <span className="font-medium text-sm truncate" title={arrival.tripHeadsign}>
                        {arrival.tripHeadsign}
                      </span>
                    </div>
                     <div className="flex items-center gap-1.5">
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
                       <p>Scheduled: {formatObaTime(arrival.scheduledArrivalTime)}</p>
                    )}
                    {arrival.status && <p>Status: {arrival.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>}
                    {arrival.vehicleId && <p>Vehicle: {arrival.vehicleId}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        {currentObaStop && !isLoadingArrivals && arrivals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Icons.Info className="inline-block mr-2 h-4 w-4" />
            No upcoming arrivals for this stop or data is currently unavailable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
