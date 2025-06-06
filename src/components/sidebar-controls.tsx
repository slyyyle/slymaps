
// @ts-nocheck
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import type { MapStyle, CustomPOI, Route as RouteType, Coordinates, TransitMode } from '@/types';
import { CustomPoiEditor } from '@/components/custom-poi-editor';
import { StyleSelector } from '@/components/style-selector';
// import { DirectionsForm } from '@/components/directions-form'; // Removed direct import
import { DirectionsResult } from '@/components/directions-result';
import { Card, CardContent, CardHeader, CardTitle as ShadCnCardTitle } from './ui/card'; // Renamed to avoid conflict
import { SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Import SheetHeader and SheetTitle

const DirectionsForm = dynamic(() => import('@/components/directions-form').then(mod => mod.DirectionsForm), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading directions form...</div>
});

interface SidebarControlsProps {
  mapStyles: MapStyle[];
  currentMapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  customPois: CustomPOI[];
  onAddCustomPoi: (poi: CustomPOI) => void;
  onUpdateCustomPoi: (poi: CustomPOI) => void;
  onDeleteCustomPoi: (poiId: string) => void;
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoadingRoute: boolean;
  currentRoute: RouteType | null;
  destination: Coordinates | null;
  setDestination: (dest: Coordinates | null) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  mapboxAccessToken: string;
}

export function SidebarControls({
  mapStyles,
  currentMapStyle,
  onMapStyleChange,
  customPois,
  onAddCustomPoi,
  onUpdateCustomPoi,
  onDeleteCustomPoi,
  onGetDirections,
  isLoadingRoute,
  currentRoute,
  destination,
  setDestination,
  onFlyTo,
  mapboxAccessToken,
}: SidebarControlsProps) {
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>("directions");

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
                mapboxAccessToken={mapboxAccessToken}
              />
              {currentRoute && <DirectionsResult route={currentRoute} />}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom-pois">
            <AccordionTrigger className="font-headline text-base">
              <Icons.MapPin className="w-5 h-5 mr-2" /> Custom POIs
            </AccordionTrigger>
            <AccordionContent>
              <CustomPoiEditor
                customPois={customPois}
                onAdd={onAddCustomPoi}
                onUpdate={onUpdateCustomPoi}
                onDelete={onDeleteCustomPoi}
                onSelectPoi={(poi) => onFlyTo({latitude: poi.latitude, longitude: poi.longitude})}
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
