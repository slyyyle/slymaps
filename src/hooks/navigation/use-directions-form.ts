"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Coordinates, TransitMode } from '@/types/core';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useToast } from '@/hooks/ui/use-toast';
import { log } from '@/lib/logging';

const directionFormSchema = z.object({
  startLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)).optional().nullable(),
  startLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)).optional().nullable(),
  endLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)),
  endLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)),
  mode: z.string().min(1, "Please select a transit mode."),
});

export type DirectionFormData = z.infer<typeof directionFormSchema>;

interface DestinationInfo {
  coordinates: Coordinates;
  address: string;
  name?: string;
}

export function useDirectionsForm() {
  const dataIntegration = useDataIntegration();
  const { flyTo } = useMapViewport();
  const { toast } = useToast();

  const {
    config: { getMapboxAccessToken },
    directions: { getDirectionsState, getDirections, setDirectionsDestination },
    location: { getCurrentLocation },
  } = dataIntegration;
  
  const currentLocation = getCurrentLocation();
  const mapboxAccessToken = getMapboxAccessToken();
  const { destination: directionsDestination, isLoading: isDirectionsLoading } = getDirectionsState();

  const [startAddressInputValue, setStartAddressInputValue] = useState('');
  const [endAddressInputValue, setEndAddressInputValue] = useState('');
  const [destinationInfo, setDestinationInfo] = useState<DestinationInfo | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const form = useForm<DirectionFormData>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: {
      mode: 'walking',
    },
  });

  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<DestinationInfo | null> => {
    if (!mapboxAccessToken) return null;
    
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?access_token=${mapboxAccessToken}&limit=1`
      );
      if (!response.ok) return null;
      const data = await response.json();
      const feature = data.features?.[0];
      if (feature) {
        return {
          coordinates: coords,
          address: feature.place_name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          name: feature.text
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [mapboxAccessToken]);

  useEffect(() => {
    if (directionsDestination && mapboxAccessToken) {
      reverseGeocode(directionsDestination).then(info => {
        if (info) {
          setDestinationInfo(info);
          form.setValue('endLat', directionsDestination.latitude);
          form.setValue('endLng', directionsDestination.longitude);
        }
      });
    } else {
      setDestinationInfo(null);
    }
  }, [directionsDestination, mapboxAccessToken, reverseGeocode, form]);
  
  const handleUseMyLocation = useCallback(() => {
    if (currentLocation) {
      form.setValue('startLat', currentLocation.latitude);
      form.setValue('startLng', currentLocation.longitude);
      setStartAddressInputValue(`${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`);
      flyTo(currentLocation, { zoom: 18 });
      log.poi('Current location used for start location:', currentLocation);
      toast({ title: "Location Set", description: "Your current location has been set as the start point." });
    } else {
      toast({ 
        title: "No Location Available", 
        description: "Please set your location using the map control at the top of the screen.", 
        variant: "destructive" 
      });
    }
  }, [currentLocation, form, flyTo, toast]);

  const handleStartAddressSelect = useCallback((coords: Coordinates, name?: string) => {
    form.setValue('startLat', coords.latitude);
    form.setValue('startLng', coords.longitude);
    setStartAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    flyTo(coords, { zoom: 18 });
  }, [form, flyTo]);

  const handleDestinationAddressSelect = useCallback((coords: Coordinates, name?: string) => {
    form.setValue('endLat', coords.latitude);
    form.setValue('endLng', coords.longitude);
    setEndAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    setDirectionsDestination(coords);
    flyTo(coords, { zoom: 18 });
  }, [form, setDirectionsDestination, flyTo]);

  const onSubmit: SubmitHandler<DirectionFormData> = async (data) => {
    if (!data.startLat || !data.startLng) {
      toast({ title: "Start Location Missing", description: "Please enter a start address or use your current location.", variant: "destructive" });
      return;
    }
    if (!data.endLat || !data.endLng) {
      toast({ title: "Destination Missing", description: "Please enter a destination address.", variant: "destructive" });
      return;
    }

    const startCoords: Coordinates = { latitude: data.startLat, longitude: data.startLng };
    const endCoords: Coordinates = { latitude: data.endLat, longitude: data.endLng };
    
    await getDirections(startCoords, endCoords, data.mode as TransitMode);
  };
  
  const clearDestination = useCallback(() => {
    setDirectionsDestination(null);
    setDestinationInfo(null);
    form.resetField('endLat');
    form.resetField('endLng');
    setEndAddressInputValue('');
  }, [setDirectionsDestination, form]);

  return {
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
  };
} 