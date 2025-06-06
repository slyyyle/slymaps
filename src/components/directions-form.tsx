"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import type { Coordinates, TransitMode } from '@/types';
import { TRANSIT_MODES } from '@/lib/constants';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';

const directionFormSchema = z.object({
  startLat: z.preprocess(val => parseFloat(val as string), z.number().min(-90).max(90)).optional(),
  startLng: z.preprocess(val => parseFloat(val as string), z.number().min(-180).max(180)).optional(),
  endLat: z.preprocess(val => parseFloat(val as string), z.number().min(-90).max(90)),
  endLng: z.preprocess(val => parseFloat(val as string), z.number().min(-180).max(180)),
  mode: z.string().min(1, "Please select a transit mode."),
});

type DirectionFormData = z.infer<typeof directionFormSchema>;

interface DirectionsFormProps {
  onGetDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  isLoading: boolean;
  destination: Coordinates | null;
  setDestination: (dest: Coordinates | null) => void; // Allow clearing destination
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
}

export function DirectionsForm({ onGetDirections, isLoading, destination, setDestination, onFlyTo }: DirectionsFormProps) {
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const { toast } = useToast();

  const form = useForm<DirectionFormData>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: {
      mode: 'driving-traffic',
    },
  });

  useEffect(() => {
    if (destination) {
      form.setValue('endLat', destination.latitude);
      form.setValue('endLng', destination.longitude);
    } else {
       // @ts-ignore
      form.setValue('endLat', undefined);
       // @ts-ignore
      form.setValue('endLng', undefined);
    }
  }, [destination, form]);
  
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('startLat', position.coords.latitude);
          form.setValue('startLng', position.coords.longitude);
          setUseCurrentLocation(true);
          onFlyTo({ latitude: position.coords.latitude, longitude: position.coords.longitude }, 15);
          toast({ title: "Current location set as start." });
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({ title: "Location Error", description: "Could not get current location.", variant: "destructive"});
          setUseCurrentLocation(false); // Fallback to manual input
        }
      );
    } else {
      toast({ title: "Location Error", description: "Geolocation is not supported by your browser.", variant: "destructive"});
      setUseCurrentLocation(false);
    }
  };

  const onSubmit: SubmitHandler<DirectionFormData> = async (data) => {
    let startCoords: Coordinates;
    if (useCurrentLocation && data.startLat && data.startLng) {
      startCoords = { latitude: data.startLat, longitude: data.startLng };
    } else if (data.startLat && data.startLng) {
       startCoords = { latitude: data.startLat, longitude: data.startLng };
    }
    else { // If current location not used and no manual start, try to get current location
       if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject)
          );
          startCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          form.setValue('startLat', startCoords.latitude);
          form.setValue('startLng', startCoords.longitude);
          setUseCurrentLocation(true); // Mark as using it now
        } catch (error) {
          toast({ title: "Start Location Missing", description: "Please set a start location or allow geolocation.", variant: "destructive" });
          return;
        }
      } else {
        toast({ title: "Start Location Missing", description: "Please set a start location.", variant: "destructive" });
        return;
      }
    }

    const endCoords: Coordinates = { latitude: data.endLat, longitude: data.endLng };
    await onGetDirections(startCoords, endCoords, data.mode as TransitMode);
  };
  
  useEffect(() => {
    // Attempt to set current location on load if "use current location" is default
    if (useCurrentLocation) {
      handleUseCurrentLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-primary" /> Start Location</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} className="w-full mb-2">
            <Icons.Geolocate className="mr-2 h-4 w-4" /> Use Current Location
          </Button>
          {!useCurrentLocation && (
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="startLat" render={({ field }) => (
                <FormItem><FormControl><Input type="number" step="any" placeholder="Latitude" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="startLng" render={({ field }) => (
                <FormItem><FormControl><Input type="number" step="any" placeholder="Longitude" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
          )}
          {useCurrentLocation && form.getValues("startLat") && (
             <p className="text-xs text-muted-foreground">Using current: {form.getValues("startLat")?.toFixed(4)}, {form.getValues("startLng")?.toFixed(4)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center"><Icons.MapPin className="mr-2 h-4 w-4 text-accent" /> Destination</Label>
           {destination ? (
             <div className="p-2 border rounded-md bg-muted/50">
                <p className="text-sm">To: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</p>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => {
                  setDestination(null);
                  // @ts-ignore
                  form.setValue('endLat', undefined);
                  // @ts-ignore
                  form.setValue('endLng', undefined);
                }}>Clear destination</Button>
             </div>
           ) : (
            <p className="text-sm text-muted-foreground">Search for a destination on the map or enter coordinates below.</p>
           )}
          <div className="grid grid-cols-2 gap-2">
            <FormField control={form.control} name="endLat" render={({ field }) => (
              <FormItem><FormControl><Input type="number" step="any" placeholder="Latitude" {...field} disabled={!!destination} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="endLng" render={({ field }) => (
              <FormItem><FormControl><Input type="number" step="any" placeholder="Longitude" {...field} disabled={!!destination} /></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
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
        <p className="text-xs text-muted-foreground"><Icons.Info className="inline h-3 w-3 mr-1" />Detailed public transit data (bus, train, ferry) relies on specialized APIs like OneBusAway, not fully integrated here. Current transit options may be limited.</p>
        <Button type="submit" disabled={isLoading || !destination} className="w-full">
          {isLoading ? <Icons.Time className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Directions className="mr-2 h-4 w-4" />}
          Get Directions
        </Button>
      </form>
    </Form>
  );
}
