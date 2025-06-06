
// @ts-nocheck
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// Removed: import { Button } from '@/components/ui/button';
// Removed: import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import type { MapStyle, CustomPOI, Route as RouteType, Coordinates, TransitMode, PointOfInterest, ObaArrivalDeparture, CurrentOBARouteDisplayData, ObaRoute } from '@/types';
import { StyleSelector } from '@/components/style-selector';
import { DirectionsResult } from '@/components/directions-result';
// Removed: import { Card, CardContent, CardHeader, CardTitle as ShadCnCardTitle } from './ui/card'; 
import { SheetHeader, SheetTitle } from '@/components/ui/sheet'; 

const DirectionsForm = dynamic(() => import('@/components/directions-form').then(mod => mod.DirectionsForm), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading directions form...</div>
});

const CustomPoiEditor = dynamic(() => import('@/components/custom-poi-editor').then(mod => mod.CustomPoiEditor), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading POI editor...</div>
});

const OneBusAwayExplorer = dynamic(() => import('@/components/onebusaway-explorer').then(mod => mod.OneBusAwayExplorer), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading OneBusAway Explorer...</div>
});

interface SidebarControlsProps {
  mapStyles: MapStyle[];
  currentMapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  customPois: CustomPOI[];
  onDeleteCustomPoi: (poiId: string) => void;
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoadingRoute: boolean;
  currentRoute: RouteType | null;
  destination: Coordinates | null;
  setDestination: (dest: Coordinates | null) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  oneBusAwayApiKey: string;
  selectedPoi: PointOfInterest | CustomPOI | null;
  onSelectPoi: (poi: PointOfInterest | CustomPOI | null) => void;
  obaStopArrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRouteForPath: (routeId: string) => void;
  isLoadingObaRouteGeometry: boolean;
  currentOBARouteDisplayData: CurrentOBARouteDisplayData | null;
  isLoadingObaVehicles: boolean;
  obaReferencedRoutes: Record<string, ObaRoute>;
}

export function SidebarControls({
  mapStyles,
  currentMapStyle,
  onMapStyleChange,
  customPois,
  onDeleteCustomPoi,
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
}: SidebarControlsProps) {
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>("onebusaway-explorer");

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

          <AccordionItem value="custom-pois">
            <AccordionTrigger className="font-headline text-base">
              <Icons.MapPin className="w-5 h-5 mr-2" /> Custom POIs
            </AccordionTrigger>
            <AccordionContent>
               <CustomPoiEditor
                customPois={customPois}
                onDelete={onDeleteCustomPoi}
                onSelectPoi={(poi) => {
                  onSelectPoi(poi); 
                  if (poi.latitude && poi.longitude) {
                    onFlyTo({latitude: poi.latitude, longitude: poi.longitude});
                  }
                }}
              />
            </AccordionContent>
          </AccordionItem>
          
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
