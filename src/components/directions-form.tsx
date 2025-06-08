"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import type { Coordinates, TransitMode } from '@/types';
import { TRANSIT_MODES } from '@/lib/constants';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/logging';

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

interface DestinationInfo {
  coordinates: Coordinates;
  address: string;
  name?: string;
}

export function DirectionsForm({ onGetDirections, isLoading, destination, setDestination, onFlyTo, mapboxAccessToken }: DirectionsFormProps) {
  const [startInputMode, setStartInputMode] = useState<'gps' | 'manual'>('manual');
  const [startAddressInputValue, setStartAddressInputValue] = useState('');
  const [endAddressInputValue, setEndAddressInputValue] = useState('');
  const [destinationInfo, setDestinationInfo] = useState<DestinationInfo | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const { toast } = useToast();

  const form = useForm<DirectionFormData>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: {
      mode: 'walking',
      startLat: null,
      startLng: null,
      endLat: undefined, // Will be set by destination prop or SearchInput
      endLng: undefined,
    },
  });

  // Reverse geocoding function following Mapbox v3 pattern
  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<DestinationInfo | null> => {
    if (!mapboxAccessToken) return null;
    
    setIsReverseGeocoding(true);
    try {
      // Use Mapbox Geocoding API for reverse geocoding
      const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places');
      const query = `${coords.longitude},${coords.latitude}.json`;
      url.pathname += `/${query}`;
      url.searchParams.set('access_token', mapboxAccessToken);
      url.searchParams.set('language', 'en');
      url.searchParams.set('limit', '1');
      url.searchParams.set('types', 'address,poi,place');
      
      log.info('🔄 Reverse geocoding coordinates:', coords);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const result: DestinationInfo = {
          coordinates: coords,
          address: feature.place_name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          name: feature.text
        };
        
        log.info('🎯 Reverse geocoded address:', result);
        return result;
      }
    } catch (error) {
      log.error('Reverse geocoding error:', error);
      // Fallback to coordinates
      return {
        coordinates: coords,
        address: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
      };
    } finally {
      setIsReverseGeocoding(false);
    }
    
    return null;
  }, [mapboxAccessToken]);

  // Effect to reverse geocode destination when it changes
  useEffect(() => {
    if (destination && mapboxAccessToken) {
      reverseGeocode(destination).then(info => {
        if (info) {
          setDestinationInfo(info);
          // Update form values
          form.setValue('endLat', destination.latitude);
          form.setValue('endLng', destination.longitude);
        }
      });
    } else {
      setDestinationInfo(null);
    }
  }, [destination, mapboxAccessToken, reverseGeocode, form]);

  const handleStartLocationGps = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          form.setValue('startLat', coords.latitude);
          form.setValue('startLng', coords.longitude);
          onFlyTo(coords, 18);
          log.poi('GPS coordinates obtained for start location:', coords);
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

  const handleStartAddressSelect = useCallback((coords: Coordinates, name: string, full_address: string) => {
    form.setValue('startLat', coords.latitude);
    form.setValue('startLng', coords.longitude);
    setStartAddressInputValue(full_address);
    onFlyTo(coords, 18);
  }, [form, onFlyTo]);

  const handleDestinationAddressSelect = useCallback((coords: Coordinates, name: string, full_address: string) => {
    form.setValue('endLat', coords.latitude);
    form.setValue('endLng', coords.longitude);
    setEndAddressInputValue(full_address);
    setDestination(coords); // Update parent state, which will flow back via 'destination' prop
    onFlyTo(coords, 18);
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

  if (!mapboxAccessToken) {
     return <div className="p-2 text-sm text-destructive">Address search disabled: Mapbox token missing.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden">
        <div className="space-y-2 overflow-hidden">
          <div className="flex items-center justify-between">
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
          </div>

          {startInputMode === 'gps' && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleStartLocationGps} className="w-full my-2">
                <Icons.Geolocate className="mr-2 h-4 w-4" /> Re-fetch Current Location
              </Button>
              {form.getValues("startLat") && form.getValues("startLng") ? (
                <p className="text-xs text-muted-foreground truncate">Using GPS: {form.getValues("startLat")?.toFixed(4)}, {form.getValues("startLng")?.toFixed(4)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Attempting to get GPS location...</p>
              )}
            </>
          )}

          {startInputMode === 'manual' && (
                      <SearchInput
            accessToken={mapboxAccessToken}
            placeholder="Enter start address"
            value={startAddressInputValue}
            onValueChange={(value) => {
              setStartAddressInputValue(value);
              // If user clears input, clear coordinates
              if (value === '') {
                form.resetField('startLat');
                form.resetField('startLng');
              }
            }}
            onResult={handleStartAddressSelect}
            onClear={() => {
              form.resetField('startLat');
              form.resetField('startLng');
            }}
            autoComplete="street-address"
            className="w-full max-w-full min-w-0 overflow-hidden"
          />
          )}
           {/* Hidden fields for validation, RHF will pick them up */}
          <FormField control={form.control} name="startLat" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          <FormField control={form.control} name="startLng" render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />} />
          {/* Show validation messages for startLat/startLng if needed */}
          <FormMessage /> 
        </div>

        <div className="space-y-2 overflow-hidden">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-accent" /> Destination</Label>
          {destination && (
             <div className="p-2 border rounded-md bg-muted/50 text-sm overflow-hidden">
                {isReverseGeocoding ? (
                  <p className="flex items-center">
                    <Icons.Time className="mr-2 h-3 w-3 animate-spin" />
                    Finding address...
                  </p>
                ) : destinationInfo ? (
                  <>
                    <p className="font-medium leading-tight break-words">{destinationInfo.name || 'Selected Location'}</p>
                    <p className="text-xs text-muted-foreground leading-tight break-words">{destinationInfo.address}</p>
                  </>
                ) : (
                  <p className="leading-tight break-words">Selected: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</p>
                )}
                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => {
                  setDestination(null); // Clears map selection
                  setDestinationInfo(null);
                  form.resetField('endLat');
                  form.resetField('endLng');
                  setEndAddressInputValue('');
                }}>Clear map selection</Button>
             </div>
           )}
          <SearchInput
            accessToken={mapboxAccessToken}
            placeholder="Enter destination address"
            value={endAddressInputValue}
            onValueChange={(value) => {
              setEndAddressInputValue(value);
              if (value === '' && !destination) { // only clear if no map destination
                form.resetField('endLat');
                form.resetField('endLng');
              }
            }}
            onResult={handleDestinationAddressSelect}
            onClear={() => {
              if (!destination) { // only clear if no map destination
                form.resetField('endLat');
                form.resetField('endLng');
              }
            }}
            autoComplete="address-line1"
            className="w-full max-w-full min-w-0 overflow-hidden"
          />
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
                  <SelectTrigger className="w-full max-w-full">
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
        <p className="text-xs text-muted-foreground overflow-hidden"><Icons.Info className="inline h-3 w-3 mr-1" />Detailed public transit data relies on specialized APIs not fully integrated. Current transit options may be limited.</p>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Directions className="mr-2 h-4 w-4" />}
          Get Directions
        </Button>
      </form>
    </Form>
  );
}
