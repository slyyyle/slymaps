"use client";

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Icons } from '@/components/icons';
import type { MapStyle, Coordinates, TransitMode, PointOfInterest, ObaArrivalDeparture, CurrentOBARouteDisplayData, ObaRoute } from '@/types';
import { StyleSelector } from '@/components/style-selector';
import { POIManager } from '@/components/poi-manager';
import { StopInformation } from '@/components/stop-information';
import { RouteDetails } from '@/components/route-details';
import { FindRouteById } from '@/components/find-route-by-id';
import { TransitBrowser } from '@/components/transit-browser';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { AgencyBrowser } from '@/components/agency-browser';

const DirectionsForm = dynamic(() => import('@/components/directions-form').then(mod => mod.DirectionsForm), {
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading...</div>
});

interface SidebarControlsProps {
  mapStyles: MapStyle[];
  currentMapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  customPois: unknown[];
  onDeleteCustomPoi: (poiId: string) => void;
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoadingRoute: boolean;
  destination: Coordinates | null;
  setDestination: (dest: Coordinates | null) => void;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  oneBusAwayApiKey: string;
  selectedPoi: PointOfInterest | null;
  onSelectPoi: (poi: PointOfInterest | null) => void;
  obaStopArrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRouteForPath: (routeId: string) => void;
  currentOBARouteDisplayData: CurrentOBARouteDisplayData | null;
  isBusy: boolean;
  obaReferencedRoutes: Record<string, ObaRoute>;
  currentLocation?: Coordinates;
}

export function SidebarControls({
  mapStyles,
  currentMapStyle,
  onMapStyleChange,
  onGetDirections,
  isLoadingRoute,
  destination,
  setDestination,
  onFlyTo,
  oneBusAwayApiKey,
  selectedPoi,
  onSelectPoi,
  obaStopArrivals,
  isLoadingArrivals,
  onSelectRouteForPath,
  currentOBARouteDisplayData,
  isBusy,
  obaReferencedRoutes,
  currentLocation,
}: SidebarControlsProps) {
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>('transit-browser');

  const handleStyleChange = useCallback((styleId: string) => {
    const newStyle = mapStyles.find(s => s.id === styleId);
    if (newStyle) {
      onMapStyleChange(newStyle);
    }
  }, [mapStyles, onMapStyleChange]);

  const renderAccordionTrigger = (title: string, icon: React.ReactNode) => (
    <AccordionTrigger className="font-headline text-lg hover:no-underline">
      <div className="flex items-center w-full min-w-0 mr-4">
        <div className="flex-shrink-0 mr-3">{icon}</div>
        <span className="truncate flex-1 text-left">{title}</span>
      </div>
    </AccordionTrigger>
  );

  const renderAccordionContent = (children: React.ReactNode) => (
    <AccordionContent>
      <div className="pr-4">
        {children}
      </div>
    </AccordionContent>
  );

  const ALL_PANELS = {
    'explore-transit': {
      title: 'Explore Transit',
      icon: <Icons.Globe className="w-6 h-6" />,
      isVisible: true,
      render: () => <AgencyBrowser />,
    },
    'directions': {
      title: 'Directions',
      icon: <Icons.Directions className="w-6 h-6" />,
      isVisible: true,
      render: () => (
        <DirectionsForm
          onGetDirections={onGetDirections}
          isLoading={isLoadingRoute}
          destination={destination}
          setDestination={setDestination}
          onFlyTo={onFlyTo}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''}
        />
      ),
    },
    'stop-information': {
      title: 'Stop Information',
      icon: <Icons.Bus className="w-6 h-6" />,
      isVisible: true,
      render: () => (
        <StopInformation
          apiKey={oneBusAwayApiKey}
          selectedPoi={selectedPoi}
          arrivals={obaStopArrivals}
          isLoadingArrivals={isLoadingArrivals}
          onSelectRoute={onSelectRouteForPath}
          isBusy={isBusy}
          obaReferencedRoutes={obaReferencedRoutes}
        />
      ),
    },
    'route-details': {
      title: `Route: ${currentOBARouteDisplayData?.routeInfo.shortName || 'Details'}`,
      icon: <Icons.Route className="w-6 h-6" />,
      isVisible: !!currentOBARouteDisplayData,
      render: () =>
        currentOBARouteDisplayData && (
          <RouteDetails
            currentOBARouteDisplayData={currentOBARouteDisplayData}
            onSelectPoiFromList={onSelectPoi}
            onFlyTo={onFlyTo}
          />
        ),
    },
    'transit-browser': {
        title: 'Browse Transit',
        icon: <Icons.Route className="w-6 h-6" />,
        isVisible: true,
        render: () => (
            <TransitBrowser
                onRouteSelect={onSelectRouteForPath}
                onStopSelect={(stopId, stopName, coords) => {
                    const poi: PointOfInterest = { id: stopId, name: stopName, type: 'Bus Stop', latitude: coords.latitude, longitude: coords.longitude, isObaStop: true };
                    onSelectPoi(poi);
                }}
                onFlyTo={onFlyTo}
                currentLocation={currentLocation}
                isLoadingRoute={isBusy}
            />
        )
    },
    'find-route-by-id': {
        title: 'Find Route by ID',
        icon: <Icons.Search className="w-6 h-6" />,
        isVisible: true,
        render: () => (
            <FindRouteById
                onSelectRoute={onSelectRouteForPath}
                isBusy={isBusy}
            />
        )
    },
    'custom-pois': {
        title: 'Custom POIs',
        icon: <Icons.MapPin className="w-6 h-6" />,
        isVisible: true,
        render: () => <POIManager accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''} onFlyTo={onFlyTo} />
    },
    'map-style': {
      title: 'Map Style',
      icon: <Icons.MapStyle className="w-6 h-6" />,
      isVisible: true,
      render: () => (
        <StyleSelector
          styles={mapStyles}
          currentStyleId={currentMapStyle.id}
          onStyleChange={handleStyleChange}
        />
      ),
    },
  };
  
  const activePanel = activeAccordionItem ? ALL_PANELS[activeAccordionItem as keyof typeof ALL_PANELS] : null;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <SheetHeader className="p-4 border-b flex-shrink-0">
        <SheetTitle className="text-lg font-headline font-semibold flex items-center">
          <Icons.Settings className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>Controls</span>
        </SheetTitle>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {activePanel ? (
            <div className='space-y-4'>
              <Button
                variant="ghost"
                onClick={() => setActiveAccordionItem(undefined)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted/50 -ml-2"
              >
                <Icons.ChevronLeft className="w-4 h-4" />
                <span>Back to All Controls</span>
              </Button>
              <Accordion type="single" value={activeAccordionItem} onValueChange={setActiveAccordionItem} className="w-full">
                <AccordionItem value={activeAccordionItem as string}>
                  {renderAccordionTrigger(activePanel.title, activePanel.icon)}
                  {renderAccordionContent(activePanel.render())}
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {Object.entries(ALL_PANELS).map(([key, panel]) =>
                panel.isVisible ? (
                  <AccordionItem value={key} key={key} className="border-b-0">
                     <Button variant='outline' className="w-full" onClick={() => setActiveAccordionItem(key)}>
                        <div className='flex items-center w-full'>
                            {panel.icon}
                            <span className="ml-3 text-base font-medium">{panel.title}</span>
                            <Icons.ChevronRight className="w-4 h-4 ml-auto" />
                        </div>
                     </Button>
                  </AccordionItem>
                ) : null
              )}
            </Accordion>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t mt-auto flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          SlyMaps &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
