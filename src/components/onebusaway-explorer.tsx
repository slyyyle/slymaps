
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface OneBusAwayExplorerProps {
  apiKey: string;
}

export function OneBusAwayExplorer({ apiKey }: OneBusAwayExplorerProps) {
  if (!apiKey || apiKey === "YOUR_ONEBUSAWAY_API_KEY_HERE") {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.Bus className="mr-2 h-5 w-5 text-primary" /> OneBusAway Real-Time Transit
        </CardTitle>
        <CardDescription>
          Explore Seattle's public transit with live data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          OneBusAway features (like stop search, real-time arrivals) coming soon!
        </p>
        {/* Placeholder for future inputs and results */}
      </CardContent>
    </Card>
  );
}
