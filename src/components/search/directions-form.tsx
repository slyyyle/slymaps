"use client";

import React from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDirectionsForm } from '@/hooks/navigation/use-directions-form';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { TRANSIT_MODES } from '@/lib/constants';
import { useDataStore } from '@/stores/use-data-store';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { Switch } from '@/components/ui/switch';

interface DirectionsFormProps {
  mapRef?: React.RefObject<MapRef>;
}

export function DirectionsForm({ mapRef }: DirectionsFormProps) {
  const dataIntegration = useDataIntegration();
  const { clearDirections } = dataIntegration.directions;
  const showTurnMarkers = useDataStore(state => state.directions.showTurnMarkers);
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
    isDirectionsLoading,
    directionsDestination,
    isReverseGeocoding,
    destinationInfo,
    clearDestination,
  } = useDirectionsForm();

  // Subscribe to the calculated route so we can render step-by-step instructions
  const route = useDataStore(state => state.directions.route);

  if (!mapboxAccessToken) {
    return <div className="p-2 text-sm text-destructive">Address search disabled: Mapbox token missing.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-primary" /> Start Location</Label>
          {startAddressInputValue ? (
            <div className="p-2 border rounded-md bg-muted/50 text-sm overflow-hidden">
              <p className="font-medium leading-tight break-words">{startAddressInputValue}</p>
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
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-accent" /> Destination</Label>
          {endAddressInputValue ? (
             <div className="p-2 border rounded-md bg-muted/50 text-sm overflow-hidden">
                {isReverseGeocoding ? (
                  <p className="flex items-center">
                    <Icons.Time className="mr-2 h-3 w-3 animate-spin" />
                    Finding address...
                  </p>
                ) : destinationInfo ? (
                  <>
                  <p className="font-medium leading-tight break-words">{destinationInfo.name || endAddressInputValue}</p>
                    <p className="text-xs text-muted-foreground leading-tight break-words">{destinationInfo.address}</p>
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
        
        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Icons.Route className="mr-2 h-4 w-4" /> Transit Mode</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full max-w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TRANSIT_MODES.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id}>
                      <div className="flex items-center">
                        {/* The TRANSIT_MODES constant does not have an icon property yet, so this is commented out. */}
                        {/* {mode.icon && <mode.icon className="mr-2 h-4 w-4" />} */}
                        {mode.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isDirectionsLoading}>
          {isDirectionsLoading ? (
            <>
              <Icons.Time className="mr-2 h-4 w-4 animate-spin" />
              Getting Directions...
            </>
          ) : (
            'Get Directions'
          )}
        </Button>

        {/* Turn-by-turn text instructions */}
        {route && (
          <div className="mt-4 p-4 bg-muted rounded-md max-h-[32rem] overflow-y-auto">
            <h4 className="mb-2 font-semibold">Directions</h4>
            <ol className="list-decimal list-inside space-y-2 marker:text-primary marker:font-semibold">
              {route.legs[0].steps.map((step, idx) => (
                <li key={idx} className="text-sm">
                  {step.maneuver.instruction}{' '}
                  <span className="text-xs text-muted-foreground">{Math.round(step.distance)}m</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {/* Toggle for turn markers on map */}
        {route && (
          <div className="flex items-center space-x-2">
            <Switch
              id="toggle-turn-markers"
              checked={showTurnMarkers}
              onCheckedChange={() => dataIntegration.directions.toggleTurnMarkers()}
            />
            <Label htmlFor="toggle-turn-markers">Show Turn Markers</Label>
          </div>
        )}
        {route && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => {
            clearDirections();
            form.reset();
            setStartAddressInputValue('');
            setEndAddressInputValue('');
          }}>
            Clear Directions
          </Button>
        )}
      </form>
    </Form>
  );
} 