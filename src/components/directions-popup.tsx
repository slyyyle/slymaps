"use client";

import React from 'react';
import type { Route as RouteType, RouteStep } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

interface DirectionsPopupProps {
  route: RouteType | null;
  onClose: () => void;
  isVisible: boolean;
  sidebarOpen: boolean;
}

// Format distance from meters to human readable
const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }
  const km = distanceInMeters / 1000;
  return `${km.toFixed(1)} km`;
};

// Format duration from seconds to human readable
const formatDuration = (durationInSeconds: number): string => {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Get appropriate icon for each maneuver type
const getIconForManeuver = (step: RouteStep): React.ReactNode => {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;

  if (type === 'depart' || type === 'arrive') return <Icons.MapPin className="h-4 w-4" />;
  if (type.includes('turn')) {
    if (modifier?.includes('left')) return <Icons.ChevronLeft className="h-4 w-4 transform rotate-[-45deg]" />;
    if (modifier?.includes('right')) return <Icons.ChevronRight className="h-4 w-4 transform rotate-[45deg]" />;
    if (modifier?.includes('straight')) return <Icons.Route className="h-4 w-4" />;
  }
  if (type.includes('continue')) return <Icons.Route className="h-4 w-4" />;
  
  return <Icons.Route className="h-4 w-4" />;
};

export function DirectionsPopup({ route, onClose, isVisible, sidebarOpen }: DirectionsPopupProps) {
  if (!isVisible || !route || !route.legs || route.legs.length === 0) {
    return null;
  }

  const firstLeg = route.legs[0];

  return (
    <div 
      className={`fixed bottom-8 w-96 z-50 transition-all duration-300 ${
        sidebarOpen ? 'left-[calc(400px+2rem)]' : 'left-8'
      }`}
      style={{ 
        maxHeight: '50vh',
        marginBottom: '32px'
      }}
    >
      <Card className="border shadow-lg bg-card">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Icons.Directions className="w-5 h-5 text-primary" />
                Route Directions
              </CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    <Icons.Time className="w-3 h-3 mr-1" />
                    {formatDuration(route.duration)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Icons.Route className="w-3 h-3 mr-1" />
                    {formatDistance(route.distance)}
                  </Badge>
                </div>
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 ml-2"
            >
              <Icons.X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-0">
          <ScrollArea 
            className="pr-3"
            style={{ 
              maxHeight: 'calc(50vh - 120px)'
            }}
          >
            <ol className="space-y-3">
              {firstLeg.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 mt-1 text-primary">
                    {getIconForManeuver(step)}
                  </span>
                  <div className="flex-grow">
                    <p className="leading-relaxed">{step.maneuver.instruction}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistance(step.distance)} ({formatDuration(step.duration)})
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 