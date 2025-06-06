
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import type { PointOfInterest, CustomPOI, ObaArrivalDeparture, CurrentOBARouteDisplayData, Coordinates, ObaRoute } from '@/types';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface OneBusAwayExplorerProps {
  apiKey: string;
  selectedPoi: PointOfInterest | CustomPOI | null;
  arrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRoute: (routeId: string) => void;
  isLoadingRoutePath: boolean;
  currentOBARouteDisplayData: CurrentOBARouteDisplayData | null;
  onSelectPoiFromList: (poi: PointOfInterest) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  isLoadingObaVehicles: boolean;
  obaReferencedRoutes: Record<string, ObaRoute>;
}

const formatObaTime = (epochTime: number | null | undefined): string => {
  if (!epochTime) return 'N/A';
  return new Date(epochTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getStatusColor = (status?: string) => {
  if (!status) return "bg-gray-500"; 
  if (status.toLowerCase().includes("scheduled") || status.toLowerCase().includes("on time")) return "bg-green-500";
  if (status.toLowerCase().includes("delayed")) return "bg-orange-500";
  if (status.toLowerCase().includes("canceled")) return "bg-red-500";
  return "bg-yellow-500"; 
};


export function OneBusAwayExplorer({ 
  apiKey, 
  selectedPoi, 
  arrivals, 
  isLoadingArrivals, 
  onSelectRoute, 
  isLoadingRoutePath,
  currentOBARouteDisplayData,
  onSelectPoiFromList,
  onFlyTo,
  isLoadingObaVehicles,
  obaReferencedRoutes,
}: OneBusAwayExplorerProps) {
  const [routeIdQuery, setRouteIdQuery] = useState('');

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

  const handleRouteSearch = () => {
    if (routeIdQuery.trim()) {
      onSelectRoute(routeIdQuery.trim());
    }
  };

  const getRouteShortName = (routeId: string): string => {
    const refRoute = obaReferencedRoutes[routeId];
    if (refRoute && refRoute.shortName) {
      return refRoute.shortName;
    }
    // Fallback if not in references (e.g. from arrivals)
    return routeId.includes('_') ? routeId.split('_')[1] : routeId;
  };
  
  const getRouteDescription = (routeId: string): string | undefined => {
    const refRoute = obaReferencedRoutes[routeId];
    return refRoute?.description || refRoute?.longName;
  };


  return (
    <div className="space-y-4">
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Bus className="mr-2 h-5 w-5 text-primary" /> Stop Information
          </CardTitle>
          {currentObaStop ? (
            <CardDescription>
              Stop #{currentObaStop.code}: {currentObaStop.name} ({currentObaStop.direction} bound)
            </CardDescription>
          ) : (
            <CardDescription>
              Select a bus stop on the map to view its details.
            </CardDescription>
          )}
        </CardHeader>
        {currentObaStop && (
          <CardContent>
            <div className="mb-3">
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
                          disabled={isLoadingRoutePath || isLoadingObaVehicles}
                          title={`Show path for route ${getRouteShortName(routeId)}`}
                        >
                          <Badge variant="secondary" className="mr-2 w-12 text-center">
                            {getRouteShortName(routeId)}
                          </Badge>
                          <span className="truncate flex-1">{getRouteDescription(routeId) || `Route ${getRouteShortName(routeId)}`}</span>
                           <Icons.Next className="h-4 w-4 text-muted-foreground ml-auto" />
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
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-bold text-base"
                              onClick={() => onSelectRoute(arrival.routeId)}
                              disabled={isLoadingRoutePath || isLoadingObaVehicles}
                              title={`Show path for route ${arrival.routeShortName}`}
                            >
                              <Badge variant="secondary" className="font-bold text-base px-2 py-1 w-16 text-center hover:bg-primary/20">
                                {arrival.routeShortName}
                              </Badge>
                            </Button>
                            <span className="font-medium text-sm truncate flex-1" title={arrival.tripHeadsign}>
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  <Icons.Info className="inline-block mr-2 h-4 w-4" />
                  No upcoming arrivals or data unavailable.
                </p>
              )}
            </div>
          </CardContent>
        )}
         {!currentObaStop && (
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                <Icons.MapPin className="inline-block mr-2 h-4 w-4" />
                No bus stop selected.
                </p>
            </CardContent>
         )}
      </Card>

     {(isLoadingRoutePath || isLoadingObaVehicles || currentOBARouteDisplayData) && <Separator className="my-4" />}
      
      {(isLoadingRoutePath || isLoadingObaVehicles) && !currentOBARouteDisplayData && (
        <div className="flex items-center justify-center text-sm text-muted-foreground p-4">
          <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> Loading route details & vehicles...
        </div>
      )}
       {isLoadingObaVehicles && currentOBARouteDisplayData && (
        <div className="flex items-center justify-center text-sm text-muted-foreground p-2">
          <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> Loading vehicle locations...
        </div>
      )}

      {currentOBARouteDisplayData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icons.Route className="mr-2 h-5 w-5 text-primary" /> Route Details: {currentOBARouteDisplayData.routeInfo.shortName}
            </CardTitle>
            <CardDescription>
             {currentOBARouteDisplayData.routeInfo.description || currentOBARouteDisplayData.routeInfo.longName || `Details for Route ${currentOBARouteDisplayData.routeInfo.shortName}`}
            </CardDescription>
             {currentOBARouteDisplayData.routeInfo.agency?.name && (
                <span className="text-xs text-muted-foreground">Agency: {currentOBARouteDisplayData.routeInfo.agency.name}</span>
            )}
          </CardHeader>
          <CardContent>
            <h4 className="text-sm font-semibold mb-2">Stops ({currentOBARouteDisplayData.stops.length}):</h4>
            {currentOBARouteDisplayData.stops.length > 0 ? (
              <ScrollArea className="h-[250px] pr-2">
                <ul className="space-y-1.5">
                  {currentOBARouteDisplayData.stops.map((stop) => (
                    <li key={stop.id}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-1.5 px-2"
                        onClick={() => {
                          onSelectPoiFromList(stop);
                          onFlyTo({ latitude: stop.latitude, longitude: stop.longitude });
                        }}
                        title={`Select stop: ${stop.name}`}
                      >
                        <div className="flex-1">
                           <p className="text-sm font-medium">{stop.name}</p>
                           <p className="text-xs text-muted-foreground">ID: {stop.code} {stop.direction ? `- ${stop.direction} bound` : ''}</p>
                        </div>
                        <Icons.Next className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No stops found for this route.</p>
            )}
          </CardContent>
        </Card>
      )}

       <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Search className="mr-2 h-5 w-5 text-primary" /> Find Route by ID
          </CardTitle>
          <CardDescription>Enter a OneBusAway Route ID (e.g., 1_100208 for KCM Route 40) to see its path and stops. This is for advanced use or debugging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="route-id-search">OBA Route ID</Label>
          <div className="flex space-x-2">
            <Input 
              id="route-id-search"
              placeholder="e.g., 1_100208"
              value={routeIdQuery}
              onChange={(e) => setRouteIdQuery(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleRouteSearch(); }}
            />
            <Button onClick={handleRouteSearch} disabled={isLoadingRoutePath || isLoadingObaVehicles || !routeIdQuery.trim()}>
              {(isLoadingRoutePath || isLoadingObaVehicles) && routeIdQuery ? <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Route className="mr-2 h-4 w-4" />}
              Show Path
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

 
