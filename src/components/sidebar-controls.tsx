// @ts-nocheck
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Icons } from '@/components/icons';
import type { MapStyle, Route as RouteType, Coordinates, TransitMode, PointOfInterest, ObaArrivalDeparture, CurrentOBARouteDisplayData, ObaRoute } from '@/types';
import { StyleSelector } from '@/components/style-selector';
import { DirectionsResult } from '@/components/directions-result';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const DirectionsForm = dynamic(() => import('@/components/directions-form').then(mod => mod.DirectionsForm), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading directions form...</div>
});

const OneBusAwayExplorer = dynamic(() => import('@/components/onebusaway-explorer').then(mod => mod.OneBusAwayExplorer), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading OneBusAway Explorer...</div>
});

interface SidebarControlsProps {
  mapStyles: MapStyle[];
  currentMapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  customPois: any[]; // Keeping for backward compatibility but not using
  onDeleteCustomPoi: (poiId: string) => void; // Keeping for backward compatibility but not using
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoadingRoute: boolean;
  currentRoute: RouteType | null;
  destination: Coordinates | null;
  setDestination: (dest: Coordinates | null) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  oneBusAwayApiKey: string;
  selectedPoi: PointOfInterest | null;
  onSelectPoi: (poi: PointOfInterest | null) => void;
  obaStopArrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRouteForPath: (routeId: string) => void;
  isLoadingObaRouteGeometry: boolean;
  currentOBARouteDisplayData: CurrentOBARouteDisplayData | null;
  isLoadingObaVehicles: boolean;
  obaReferencedRoutes: Record<string, ObaRoute>;
  onChangeLightPreset?: (preset: 'day' | 'dusk' | 'dawn' | 'night') => void; // New prop for lighting control
  currentLightPreset?: 'day' | 'dusk' | 'dawn' | 'night'; // New prop for current lighting state
  isAutoLighting?: boolean; // New prop for auto lighting state
  onToggleAutoLighting?: (auto: boolean) => void; // New prop for toggling auto lighting
}

export function SidebarControls({
  mapStyles,
  currentMapStyle,
  onMapStyleChange,
  // customPois, // Removed
  // onDeleteCustomPoi, // Removed
  onGetDirections,
  isLoadingRoute,
  currentRoute,
  destination,
  setDestination,
  onFlyTo,
  oneBusAwayApiKey,
  selectedPoi,
  onSelectPoi,
  obaStopArrivals,
  isLoadingArrivals,
  onSelectRouteForPath,
  isLoadingObaRouteGeometry,
  currentOBARouteDisplayData,
  isLoadingObaVehicles,
  obaReferencedRoutes,
  onChangeLightPreset,
  currentLightPreset = 'day',
  isAutoLighting = true,
  onToggleAutoLighting,
}: SidebarControlsProps) {
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>("onebusaway-explorer");

  const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');

  const lightingOptions = [
    { value: 'day', label: 'Day', icon: '☀️', description: 'Bright daylight with clear visibility' },
    { value: 'dusk', label: 'Dusk', icon: '🌆', description: 'Golden hour with warm lighting' },
    { value: 'dawn', label: 'Dawn', icon: '🌅', description: 'Early morning with soft light' },
    { value: 'night', label: 'Night', icon: '🌙', description: 'Dark atmosphere with city lights' },
  ] as const;

  return (
    <>
      <SheetHeader className="p-4 border-b">
        <SheetTitle className="text-lg font-headline font-semibold flex items-center">
          <Icons.Settings className="w-5 h-5 mr-2" />
          Controls
        </SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-1">
        <Accordion type="single" collapsible className="w-full p-4" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
          <AccordionItem value="directions">
            <AccordionTrigger className="font-headline text-base">
              <Icons.Directions className="w-5 h-5 mr-2" /> Directions
            </AccordionTrigger>
            <AccordionContent>
              <DirectionsForm
                onGetDirections={onGetDirections}
                isLoading={isLoadingRoute}
                destination={destination}
                setDestination={setDestination}
                onFlyTo={onFlyTo}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''} 
              />
              {currentRoute && <DirectionsResult route={currentRoute} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="onebusaway-explorer">
            <AccordionTrigger className="font-headline text-base">
              <Icons.Bus className="w-5 h-5 mr-2" /> OneBusAway Explorer
            </AccordionTrigger>
            <AccordionContent>
              <OneBusAwayExplorer 
                apiKey={oneBusAwayApiKey}
                selectedPoi={selectedPoi}
                arrivals={obaStopArrivals}
                isLoadingArrivals={isLoadingArrivals}
                onSelectRoute={onSelectRouteForPath}
                isLoadingRoutePath={isLoadingObaRouteGeometry}
                currentOBARouteDisplayData={currentOBARouteDisplayData}
                onSelectPoiFromList={onSelectPoi}
                onFlyTo={onFlyTo}
                isLoadingObaVehicles={isLoadingObaVehicles}
                obaReferencedRoutes={obaReferencedRoutes}
              />
            </AccordionContent>
          </AccordionItem>

          {isStandardStyle && onChangeLightPreset && onToggleAutoLighting && (
            <AccordionItem value="lighting-3d">
              <AccordionTrigger className="font-headline text-base">
                <Icons.Lightbulb className="w-5 h-5 mr-2" /> Lighting & 3D Effects
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-headline">Dynamic Lighting</CardTitle>
                    <CardDescription className="text-xs">
                      Experience realistic 3D lighting and shadows
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    {/* Auto/Manual Toggle */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-lighting" className="text-sm font-medium">
                        {isAutoLighting ? '🕐 Automatic Lighting' : '🎨 Manual Control'}
                      </Label>
                      <Switch
                        id="auto-lighting"
                        checked={isAutoLighting}
                        onCheckedChange={onToggleAutoLighting}
                      />
                    </div>
                    
                    {/* Manual Controls */}
                    <div className={`grid grid-cols-2 gap-2 ${isAutoLighting ? 'opacity-50 pointer-events-none' : ''}`}>
                      {lightingOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={currentLightPreset === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => onChangeLightPreset(option.value)}
                          className="flex flex-col items-center gap-1 h-auto py-2 px-2"
                          title={isAutoLighting ? "Enable manual control to use this preset" : option.description}
                          disabled={isAutoLighting}
                        >
                          <span className="text-lg">{option.icon}</span>
                          <span className="text-xs font-medium">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    {/* Status Display */}
                    <div className="mt-3 p-2 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        ✨ <strong>Current:</strong> {lightingOptions.find(opt => opt.value === currentLightPreset)?.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isAutoLighting 
                          ? '🕐 Lighting updates automatically based on current time' 
                          : '🎨 Lighting set to manual control - use buttons above'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )}
          
          <AccordionItem value="map-style">
            <AccordionTrigger className="font-headline text-base">
              <Icons.MapStyle className="w-5 h-5 mr-2" /> Map Style
            </AccordionTrigger>
            <AccordionContent>
              <StyleSelector
                styles={mapStyles}
                currentStyleId={currentMapStyle.id}
                onStyleChange={(styleId) => {
                  const newStyle = mapStyles.find(s => s.id === styleId);
                  if (newStyle) onMapStyleChange(newStyle);
                }}
              />
              {isStandardStyle && (
                <div className="mt-3 p-2 bg-primary/10 rounded-md">
                  <p className="text-xs text-primary font-medium">🚀 Mapbox Standard v3 Active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enhanced 3D buildings, dynamic lighting, and interactive POIs enabled
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
      <div className="p-4 border-t mt-auto">
        <p className="text-xs text-muted-foreground text-center">
          Seattle Transit Compass &copy; {new Date().getFullYear()}
        </p>
      </div>
    </>
  );
}
