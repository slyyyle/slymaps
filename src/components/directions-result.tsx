"use client";

import React from 'react';
import type { Route as RouteType, RouteStep } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

interface DirectionsResultProps {
  route: RouteType;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const getIconForManeuver = (step: RouteStep): React.ReactNode => {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;

  if (type === 'depart' || type === 'arrive') return <Icons.MapPin className="h-4 w-4" />;
  if (type.includes('turn')) {
    if (modifier?.includes('left')) return <Icons.ChevronLeft className="h-4 w-4 transform rotate-[-45deg]" />;
    if (modifier?.includes('right')) return <Icons.ChevronRight className="h-4 w-4 transform rotate-[45deg]" />;
    if (modifier?.includes('straight')) return <Icons.Route className="h-4 w-4" />; // Or an up arrow if available
  }
  if (type.includes('continue')) return <Icons.Route className="h-4 w-4" />;
  
  // Default icon based on mode (if available, not directly in Mapbox step data usually)
  // For now, a generic route icon
  return <Icons.Route className="h-4 w-4" />;
};


export function DirectionsResult({ route }: DirectionsResultProps) {
  if (!route || !route.legs || route.legs.length === 0) {
    return <p className="text-sm text-muted-foreground">No route information available.</p>;
  }

  const firstLeg = route.legs[0];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="font-headline text-lg">Route Details</CardTitle>
        <CardDescription>
          Total Duration: <Badge variant="secondary">{formatDuration(route.duration)}</Badge> | 
          Total Distance: <Badge variant="secondary">{formatDistance(route.distance)}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-3">
          <ol className="space-y-3">
            {firstLeg.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 mt-1 text-primary">
                   {getIconForManeuver(step)}
                </span>
                <div className="flex-grow">
                  <p>{step.maneuver.instruction}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(step.distance)} ({formatDuration(step.duration)})
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
