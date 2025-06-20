"use client";

import React from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDirectionsForm } from '@/hooks/navigation/use-directions-form';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { TRANSIT_MODES } from '@/lib/constants';
import { useMapRouteHandler } from '@/hooks/map';
import { useTransitStore } from '@/stores/transit';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatAddressLines } from '@/utils/address-utils';
import type { Route as MapboxRoute } from '@/types/transit/directions';
import { useDirectionsMode } from '@/contexts/DirectionsModeContext';

interface DirectionsFormProps {
  mapRef?: React.RefObject<MapRef>;
  onBeginTrip?: () => void;
}

export function DirectionsForm({ mapRef, onBeginTrip }: DirectionsFormProps) {
  const { clearRouteSelection, getActiveRoute } = useMapRouteHandler();
  const {
    form,
    onSubmit,
    mapboxAccessToken,
    startAddressInputValue,
    setStartAddressInputValue,
    endAddressInputValue,
    setEndAddressInputValue,
    handleUseMyLocation,
    handleStartAddressSelect,
    handleDestinationAddressSelect,
    isLoading,
    isReverseGeocoding,
    destinationInfo,
    clearDestination,
    startInfo,
  } = useDirectionsForm();

  const updateRoute = useTransitStore(state => state.updateRoute);
  const activeRouteId = useTransitStore(state => state.activeRouteId);

  const activeRoute = getActiveRoute();
  const primaryRoute = activeRoute?.mapboxRoute ?? null;
  const alternatives = primaryRoute?.alternatives ?? [];
  
  // Track the currently selected mode for UI
  const { mode: selectedMode, setMode } = useDirectionsMode();
  
  // Determine if this is a transit route (OTP) vs Mapbox route
  const isTransitRoute = selectedMode === 'transit';
  
  // For non-transit routes, preserve alternatives for tab switching
  const initialPrimaryRouteRef = React.useRef<MapboxRoute | null>(null);
  const initialAlternativesRef = React.useRef<MapboxRoute[]>([]);
  React.useEffect(() => {
    if (!initialPrimaryRouteRef.current && primaryRoute && !isTransitRoute) {
      initialPrimaryRouteRef.current = primaryRoute;
      initialAlternativesRef.current = alternatives;
    }
  }, [primaryRoute, alternatives, isTransitRoute]);
  
  const initialPrimaryRoute = initialPrimaryRouteRef.current;
  const initialAlternatives = initialAlternativesRef.current;
  const [selectedAlt, setSelectedAlt] = React.useState(0);
  
  const route = React.useMemo(() => {
    if (!primaryRoute) return null;
    
    // For transit routes, always use the primary route
    if (isTransitRoute) return primaryRoute;
    
    // For non-transit routes, allow switching between alternatives
    if (!initialPrimaryRoute) return primaryRoute;
    if (selectedAlt === 0) return initialPrimaryRoute;
    return initialAlternatives[selectedAlt - 1] ?? initialPrimaryRoute;
  }, [primaryRoute, initialPrimaryRoute, initialAlternatives, selectedAlt, isTransitRoute]);
  
  // Reset preserved routes and tabs when the active route is cleared or mode changes
  React.useEffect(() => {
    if (!activeRoute || isTransitRoute) {
      initialPrimaryRouteRef.current = null;
      initialAlternativesRef.current = [];
      setSelectedAlt(0);
    }
  }, [activeRoute, isTransitRoute]);

  if (!mapboxAccessToken) {
    return <div className="p-2 text-sm text-destructive">Address search disabled: Mapbox token missing.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-green-600" /> Start Location</Label>
          {startAddressInputValue ? (
            <div className="p-2 border rounded-md bg-muted/50 text-sm overflow-hidden">
              {isReverseGeocoding ? (
                <p>Finding address...</p>
              ) : startInfo ? (
                <>
                  <p className="font-medium leading-tight break-words">{startInfo.name || startInfo.address}</p>
                  {formatAddressLines(startInfo.address).map((line, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground leading-tight break-words">{line}</p>
                  ))}
                </>
              ) : (
                <p className="font-medium leading-tight break-words">{startAddressInputValue}</p>
              )}
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => {
                form.resetField('startLat');
                form.resetField('startLng');
                setStartAddressInputValue('');
              }}>Edit</Button>
            </div>
          ) : (
          <UnifiedSearchBox
            accessToken={mapboxAccessToken}
            placeholder="Enter start address"
            suggestionTypes={['place','stop']}
            onResult={handleStartAddressSelect}
            onRouteSelect={(routeId) => {
              // For routes, we could show route info or use first stop
              console.log('Route selected for start:', routeId);
            }}
            onStopSelect={(stop) => {
              // Use stop coordinates as start location
              handleStartAddressSelect(
                { latitude: stop.latitude, longitude: stop.longitude }, 
                stop.name
              );
            }}
            onClear={() => {
              form.resetField('startLat');
              form.resetField('startLng');
              setStartAddressInputValue('');
            }}
            showNearbyTransit={false}
            className="w-full max-w-full min-w-0"
            mapRef={mapRef}
          />
          )}
          <FormField control={form.control} name="startLat" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormField control={form.control} name="startLng" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormMessage />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-red-600" /> Destination</Label>
          {endAddressInputValue ? (
             <div className="p-2 border rounded-md bg-muted/50 text-sm overflow-hidden">
                {isReverseGeocoding ? (
                  <p className="flex items-center">
                    <Icons.Time className="mr-2 h-3 w-3 animate-spin" />
                    Finding address...
                  </p>
                ) : destinationInfo ? (
                  <>
                  <p className="font-medium leading-tight break-words">{destinationInfo.name || destinationInfo.address}</p>
                    {formatAddressLines(destinationInfo.address).map((line, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground leading-tight break-words">{line}</p>
                    ))}
                  </>
                ) : (
                <p className="leading-tight break-words">{endAddressInputValue}</p>
                )}
              <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={clearDestination}>Edit</Button>
             </div>
          ) : (
          <UnifiedSearchBox
            accessToken={mapboxAccessToken}
            placeholder="Enter destination address"
            suggestionTypes={['place','stop']}
            onResult={handleDestinationAddressSelect}
            onRouteSelect={(routeId) => {
              console.log('Route selected for destination:', routeId);
            }}
            onStopSelect={(stop) => {
              handleDestinationAddressSelect(
                { latitude: stop.latitude, longitude: stop.longitude }, 
                stop.name
              );
            }}
            onClear={() => {
                form.resetField('endLat');
                form.resetField('endLng');
              setEndAddressInputValue('');
            }}
            showNearbyTransit={false}
            className="w-full max-w-full min-w-0"
            mapRef={mapRef}
          />
          )}
          <FormField control={form.control} name="endLat" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormField control={form.control} name="endLng" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormMessage />
        </div>
        
        {/* Show mode toggles and Directions when no route */}
        {!route && (
          <div className="flex space-x-2 items-center">
            <Button type="button" variant={selectedMode === 'driving' ? 'default' : 'outline'} size="sm" onClick={() => setMode('driving')}>
              <Icons.Driving className="h-4 w-4" />
            </Button>
            <Button type="button" variant={selectedMode === 'walking' ? 'default' : 'outline'} size="sm" onClick={() => setMode('walking')}>
              <Icons.Walking className="h-4 w-4" />
            </Button>
            <Button type="button" variant={selectedMode === 'cycling' ? 'default' : 'outline'} size="sm" onClick={() => setMode('cycling')}>
              <Icons.Cycling className="h-4 w-4" />
            </Button>
            <Button type="button" variant={selectedMode === 'transit' ? 'default' : 'outline'} size="sm" onClick={() => setMode('transit')}>
              <Icons.Bus className="h-4 w-4" />
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? (
                <><Icons.Time className="mr-2 h-4 w-4 animate-spin" />Getting Directions...</>
              ) : (
                'Directions'
              )}
            </Button>
          </div>
        )}
        {/* Show Clear and Begin Trip when route is active */}
        {route && (
          <div className="flex space-x-2 items-center">
            {/* Show selected mode icon */}
            <Button type="button" variant="default" size="sm">
              {selectedMode === 'driving' ? <Icons.Driving className="h-4 w-4" />
               : selectedMode === 'walking' ? <Icons.Walking className="h-4 w-4" />
               : selectedMode === 'cycling' ? <Icons.Cycling className="h-4 w-4" />
               : <Icons.Bus className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              clearRouteSelection(); form.reset(); setStartAddressInputValue(''); setEndAddressInputValue('');
            }}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBeginTrip?.()}>
              Begin Trip
            </Button>
          </div>
        )}

        {/* Show tabs for route alternatives when available (non-transit routes only) */}
        {route && !isTransitRoute && initialPrimaryRoute && alternatives.length > 0 ? (
          <Tabs
            value={String(selectedAlt)}
            onValueChange={(val) => {
              const idx = parseInt(val, 10);
              setSelectedAlt(idx);
              if (!activeRouteId) return;
              if (idx === 0) {
                updateRoute(activeRouteId, { mapboxRoute: initialPrimaryRoute! });
              } else {
                const chosen = alternatives[idx - 1];
                updateRoute(activeRouteId, { mapboxRoute: chosen });
              }
            }}
            className="mt-4"
          >
            <TabsList className="flex w-full space-x-2 bg-muted p-1 rounded">
              <TabsTrigger value="0" className="flex-1 text-center text-xs">
                Primary
              </TabsTrigger>
              {alternatives.map((alt, i) => (
                <TabsTrigger key={i + 1} value={String(i + 1)} className="flex-1 text-center text-xs">
                  Alt {i + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={String(selectedAlt)} className="mt-2 space-y-3">
              {/* Route summary */}
              {route && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="text-sm">
                    <span className="font-medium">{Math.round(route.distance / 1000)}km</span>
                    <span className="text-muted-foreground"> • </span>
                    <span>{Math.round(route.duration / 60)}min</span>
                  </div>
                </div>
              )}
              {/* Turn-by-turn text instructions */}
              <div className="p-4 bg-muted rounded-md max-h-[32rem] overflow-y-auto">
                {route.legs.map((leg, legIndex) => (
                  <div key={legIndex} className="mb-4">
                    {route.legs.length > 1 && (
                      <h5 className="font-medium text-sm mb-2 text-primary">
                        {leg.summary}
                      </h5>
                    )}
                    <ol className="list-decimal list-inside space-y-2 marker:text-primary marker:font-semibold">
                      {leg.steps.map((step: any, stepIndex: number) => (
                        <li key={stepIndex} className="text-sm">
                          {step.maneuver.instruction}{' '}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(step.distance)}m
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          route && (
            <>
              {/* Route summary */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="text-sm">
                    <span className="font-medium">{Math.round(route.distance / 1000)}km</span>
                    <span className="text-muted-foreground"> • </span>
                    <span>{Math.round(route.duration / 60)}min</span>
                    {isTransitRoute && (
                      <>
                        <span className="text-muted-foreground"> • </span>
                        <span className="text-xs text-muted-foreground">Transit route</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Instructions display */}
                <div className="p-4 bg-muted rounded-md max-h-[32rem] overflow-y-auto">
                  {route.legs.map((leg, legIndex) => (
                    <div key={legIndex} className="mb-4">
                      {route.legs.length > 1 && (
                        <h5 className="font-medium text-sm mb-2 text-primary">
                          {leg.summary}
                        </h5>
                      )}
                      <ol className="list-decimal list-inside space-y-2 marker:text-primary marker:font-semibold">
                        {leg.steps.map((step: any, stepIndex: number) => (
                          <li key={stepIndex} className="text-sm">
                            {step.maneuver.instruction}{' '}
                            <span className="text-xs text-muted-foreground">
                              {Math.round(step.distance)}m
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        )}
      </form>
    </Form>
  );
} 