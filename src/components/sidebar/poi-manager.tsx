"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import type { Coordinates } from '@/types/core';

interface CustomPOI {
  id: string;
  name: string;
  description?: string;
  coordinates: Coordinates;
  createdAt: Date;
}

interface POIManagerProps {
  accessToken?: string;
}

export function POIManager({ accessToken }: POIManagerProps) {
  const { flyTo } = useMapViewport();
  const [customPOIs, setCustomPOIs] = useState<CustomPOI[]>([]);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [newPOIName, setNewPOIName] = useState('');
  const [newPOIDescription, setNewPOIDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: Coordinates;
    address: string;
  } | null>(null);

  const handleLocationSelect = (coords: Coordinates, name?: string) => {
    setSelectedLocation({
      coordinates: coords,
      address: name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
    });
  };

  const handleAddPOI = () => {
    if (!selectedLocation || !newPOIName.trim()) return;

    const newPOI: CustomPOI = {
      id: crypto.randomUUID(),
      name: newPOIName.trim(),
      description: newPOIDescription.trim() || undefined,
      coordinates: selectedLocation.coordinates,
      createdAt: new Date()
    };

    setCustomPOIs(prev => [...prev, newPOI]);
    
    // Reset form
    setNewPOIName('');
    setNewPOIDescription('');
    setSelectedLocation(null);
    setIsAddingPOI(false);
  };

  const handleDeletePOI = (poiId: string) => {
    setCustomPOIs(prev => prev.filter(poi => poi.id !== poiId));
  };

  const handleViewPOI = (poi: CustomPOI) => {
    flyTo(poi.coordinates, { zoom: 15 });
  };

  const cancelAddPOI = () => {
    setNewPOIName('');
    setNewPOIDescription('');
    setSelectedLocation(null);
    setIsAddingPOI(false);
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-headline font-semibold flex items-center">
          <Icons.MapPin className="w-5 h-5 mr-2" />
          Custom POIs
        </h3>
        {!isAddingPOI && (
          <Button 
            size="sm" 
            onClick={() => setIsAddingPOI(true)}
            className="h-8"
          >
            <Icons.Plus className="w-4 h-4 mr-1" />
            Add POI
          </Button>
        )}
      </div>

      {isAddingPOI && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add New POI</CardTitle>
            <CardDescription className="text-sm">
              Search for a location and give it a custom name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-hidden">
            <div className="overflow-hidden">
              <Label htmlFor="poi-location" className="text-sm font-medium">Location</Label>
              <UnifiedSearchBox
                accessToken={accessToken || ''}
                placeholder="Search for location..."
                onResult={handleLocationSelect}
                onRouteSelect={(routeId) => {
                  // For routes, we could show route info or use first stop
                  console.log('Route selected for POI:', routeId);
                }}
                onStopSelect={(stop) => {
                  // Use stop coordinates and name for POI location
                  handleLocationSelect(
                    { latitude: stop.latitude, longitude: stop.longitude }, 
                    `${stop.name} (Stop #${stop.code})`
                  );
                }}
                onClear={() => setSelectedLocation(null)}
                showNearbyTransit={false}
                className="mt-1 max-w-full min-w-0"
              />
              {selectedLocation && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight break-words">
                  📍 {selectedLocation.address}
                </p>
              )}
            </div>

            <div className="overflow-hidden">
              <Label htmlFor="poi-name" className="text-sm font-medium">POI Name *</Label>
              <Input
                id="poi-name"
                placeholder="e.g., My Favorite Coffee Shop"
                value={newPOIName}
                onChange={(e) => setNewPOIName(e.target.value)}
                className="mt-1 max-w-full"
              />
            </div>

            <div className="overflow-hidden">
              <Label htmlFor="poi-description" className="text-sm font-medium">Description (Optional)</Label>
              <Input
                id="poi-description"
                placeholder="e.g., Great espresso and wifi"
                value={newPOIDescription}
                onChange={(e) => setNewPOIDescription(e.target.value)}
                className="mt-1 max-w-full"
              />
            </div>

            <div className="flex gap-2 pt-2 overflow-hidden">
              <Button
                size="sm"
                onClick={handleAddPOI}
                disabled={!selectedLocation || !newPOIName.trim()}
                className="flex-1 min-w-0"
              >
                <Icons.Save className="w-4 h-4 mr-1" />
                Add POI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelAddPOI}
                className="flex-1 min-w-0"
              >
                <Icons.Close className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {customPOIs.length > 0 && (
        <div className="space-y-2 overflow-hidden">
          <Label className="text-sm font-medium text-muted-foreground">
            Your POIs ({customPOIs.length})
          </Label>
          {customPOIs.map((poi) => (
            <Card key={poi.id} className="p-3 overflow-hidden">
              <div className="flex items-start justify-between overflow-hidden">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h4 className="font-medium text-sm leading-tight break-words">{poi.name}</h4>
                  {poi.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-tight break-words">{poi.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 leading-tight break-words">
                    {poi.coordinates.latitude.toFixed(4)}, {poi.coordinates.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleViewPOI(poi)}
                    className="h-8 w-8"
                    title="View on map"
                  >
                    <Icons.ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeletePOI(poi.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete POI"
                  >
                    <Icons.Delete className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {customPOIs.length === 0 && !isAddingPOI && (
        <div className="text-center py-6 text-muted-foreground">
          <Icons.MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No custom POIs yet</p>
          <p className="text-xs">Add your first point of interest!</p>
        </div>
      )}
    </div>
  );
} 