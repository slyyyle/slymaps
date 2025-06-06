
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AddressAutofill, config as mapboxSearchConfig } from '@mapbox/search-js-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import type { Coordinates, TransitMode } from '@/types';
import { TRANSIT_MODES } from '@/lib/constants';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';

const directionFormSchema = z.object({
  startLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)).optional().nullable(),
  startLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)).optional().nullable(),
  endLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)),
  endLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)),
  mode: z.string().min(1, "Please select a transit mode."),
});

type DirectionFormData = z.infer<typeof directionFormSchema>;

interface DirectionsFormProps {
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoading: boolean;
  destination: Coordinates | null; // Destination set from map click or main search bar
  setDestination: (dest: Coordinates | null) => void; 
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  mapboxAccessToken: string;
}

export function DirectionsForm({ onGetDirections, isLoading, destination, setDestination, onFlyTo, mapboxAccessToken }: DirectionsFormProps) {
  const [startInputMode, setStartInputMode] = useState<'manual' | 'gps'>('manual');
  const [startAddressInputValue, setStartAddressInputValue] = useState('');
  const [endAddressInputValue, setEndAddressInputValue] = useState('');
  const [tokenInitializing, setTokenInitializing] = useState(true);

  const { toast } = useToast();

  const form = useForm<DirectionFormData>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: {
      mode: 'walking',
      startLat: null,
      startLng: null,
      endLat: undefined, // Will be set by destination prop or AddressAutofill
      endLng: undefined,
    },
  });

  useEffect(() => {
    if (mapboxAccessToken) {
      mapboxSearchConfig.accessToken = mapboxAccessToken;
      setTokenInitializing(false);
    }
  }, [mapboxAccessToken]);

  useEffect(() => {
    if (destination) {
      form.setValue('endLat', destination.latitude);
      form.setValue('endLng', destination.longitude);
      // Potentially reverse geocode to set endAddressInputValue or show "Selected on map"
      setEndAddressInputValue(`Selected: ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`);
    } else {
      form.resetField('endLat');
      form.resetField('endLng');
      // Only clear input if it wasn't user-typed for an address search
      // This logic might need refinement based on desired UX when clearing map-selected destination
      // setEndAddressInputValue(''); 
    }
  }, [destination, form]);

  const handleStartLocationGps = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('startLat', position.coords.latitude);
          form.setValue('startLng', position.coords.longitude);
          onFlyTo({ latitude: position.coords.latitude, longitude: position.coords.longitude }, 15);
          toast({ title: "Current location set as start." });
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({ title: "Location Error", description: "Could not get current location. Please enter manually or check permissions.", variant: "destructive"});
          setStartInputMode('manual'); // Fallback to manual
        }
      );
    } else {
      toast({ title: "Location Error", description: "Geolocation is not supported by your browser.", variant: "destructive"});
      setStartInputMode('manual'); // Fallback to manual
    }
  }, [form, onFlyTo, toast]);

  useEffect(() => {
    if (startInputMode === 'gps') {
      handleStartLocationGps();
    } else {
      // Clear GPS-derived coordinates if switching to manual, unless user already typed an address
      // form.resetField('startLat');
      // form.resetField('startLng');
    }
  }, [startInputMode, handleStartLocationGps, form]);

  const handleStartAddressSelect = useCallback((res: any) => {
    const feature = res.features[0];
    if (feature) {
      const coords: Coordinates = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      };
      form.setValue('startLat', coords.latitude);
      form.setValue('startLng', coords.longitude);
      setStartAddressInputValue(feature.properties.formatted_address || feature.properties.name || '');
      onFlyTo(coords, 15);
    }
  }, [form, onFlyTo]);

  const handleDestinationAddressSelect = useCallback((res: any) => {
    const feature = res.features[0];
    if (feature) {
      const coords: Coordinates = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      };
      form.setValue('endLat', coords.latitude);
      form.setValue('endLng', coords.longitude);
      setEndAddressInputValue(feature.properties.formatted_address || feature.properties.name || '');
      setDestination(coords); // Update parent state, which will flow back via 'destination' prop
      onFlyTo(coords, 15);
    }
  }, [form, setDestination, onFlyTo]);
  

  const onSubmit: SubmitHandler<DirectionFormData> = async (data) => {
    let startCoords: Coordinates | null = null;

    if (startInputMode === 'gps') {
      if (data.startLat != null && data.startLng != null) {
        startCoords = { latitude: data.startLat, longitude: data.startLng };
      } else {
        toast({ title: "Start Location Missing", description: "Could not get GPS location. Please try again or enter manually.", variant: "destructive" });
        return;
      }
    } else { // Manual mode
      if (data.startLat != null && data.startLng != null) {
        startCoords = { latitude: data.startLat, longitude: data.startLng };
      } else {
        toast({ title: "Start Location Missing", description: "Please enter a start address.", variant: "destructive" });
        return;
      }
    }

    if (!data.endLat || !data.endLng) {
        toast({ title: "Destination Missing", description: "Please enter a destination address.", variant: "destructive" });
        return;
    }
    const endCoords: Coordinates = { latitude: data.endLat, longitude: data.endLng };
    
    if (startCoords) {
        await onGetDirections(startCoords, endCoords, data.mode as TransitMode);
    }
  };

  if (tokenInitializing && !mapboxAccessToken) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing address search...</div>;
  }
  if (!mapboxAccessToken) {
     return <div className="p-2 text-sm text-destructive">Address search disabled: Mapbox token missing.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-primary" /> Start Location</Label>
          <div className="flex items-center space-x-2">
            <Label htmlFor="start-input-mode-toggle" className="text-sm">Manual</Label>
            <Switch
              id="start-input-mode-toggle"
              checked={startInputMode === 'gps'}
              onCheckedChange={(checked) => setStartInputMode(checked ? 'gps' : 'manual')}
            />
            <Label htmlFor="start-input-mode-toggle" className="text-sm">GPS</Label>
          </div>

          {startInputMode === 'gps' && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleStartLocationGps} className="w-full my-2">
                <Icons.Geolocate className="mr-2 h-4 w-4" /> Re-fetch Current Location
              </Button>
              {form.getValues("startLat") && form.getValues("startLng") ? (
                <p className="text-xs text-muted-foreground">Using GPS: {form.getValues("startLat")?.toFixed(4)}, {form.getValues("startLng")?.toFixed(4)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Attempting to get GPS location...</p>
              )}
            </>
          )}

          {startInputMode === 'manual' && (
            <>
              {/* @ts-expect-error - AddressAutofill has type compatibility issues with React 18 */}
              <AddressAutofill accessToken={mapboxAccessToken} onRetrieve={handleStartAddressSelect} options={{country: "US", language: "en"}}>
                <Input
                  placeholder="Enter start address"
                  value={startAddressInputValue}
                  onChange={(e) => {
                    setStartAddressInputValue(e.target.value);
                    // If user types, clear any previously set start lat/lng from address search
                    if (e.target.value === '') {
                       form.resetField('startLat');
                       form.resetField('startLng');
                    }
                  }}
                  autoComplete="street-address"
                  className="w-full"
                />
              </AddressAutofill>
            </>
          )}
           {/* Hidden fields for validation, RHF will pick them up */}
          <FormField control={form.control} name="startLat" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormField control={form.control} name="startLng" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          {/* Show validation messages for startLat/startLng if needed */}
          <FormMessage /> 
        </div>

        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-accent" /> Destination</Label>
          {destination && (
             <div className="p-2 border rounded-md bg-muted/50 text-sm">
                <p>Current Selection: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</p>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => {
                  setDestination(null); // Clears map selection
                  form.resetField('endLat');
                  form.resetField('endLng');
                  setEndAddressInputValue('');
                }}>Clear map selection</Button>
             </div>
           )}
          {/* @ts-expect-error - AddressAutofill has type compatibility issues with React 18 */}
          <AddressAutofill accessToken={mapboxAccessToken} onRetrieve={handleDestinationAddressSelect} options={{country: "US", language: "en"}}>
            <Input
              placeholder="Enter destination address"
              value={endAddressInputValue}
              onChange={(e) => {
                setEndAddressInputValue(e.target.value);
                 if (e.target.value === '' && !destination) { // only clear if no map destination
                     form.resetField('endLat');
                     form.resetField('endLng');
                  }
              }}
              autoComplete="shipping address-line1" // Or other appropriate type
              className="w-full"
            />
          </AddressAutofill>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TRANSIT_MODES.map(mode => (
                    <SelectItem key={mode.id} value={mode.id}>{mode.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground"><Icons.Info className="inline h-3 w-3 mr-1" />Detailed public transit data relies on specialized APIs not fully integrated. Current transit options may be limited.</p>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Directions className="mr-2 h-4 w-4" />}
          Get Directions
        </Button>
      </form>
    </Form>
  );
}
