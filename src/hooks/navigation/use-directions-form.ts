"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Coordinates, TransitMode } from '@/types/core';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { useGeoPosition } from '@/hooks/data/use-geo-position';
import { useMapRouteHandler } from '@/hooks/map';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useToast } from '@/hooks/ui/use-toast';
import { log } from '@/lib/logging';
import * as Errors from '@/lib/errors';
import { usePlaceIntegration } from '@/hooks/data/use-place-integration';
import { useTransitStore } from '@/stores/transit';
import { useDirectionsMode } from '@/contexts/DirectionsModeContext';

const directionFormSchema = z.object({
  startLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)).optional().nullable(),
  startLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)).optional().nullable(),
  endLat: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-90).max(90)),
  endLng: z.preprocess(val => typeof val === 'string' && val !== '' ? parseFloat(val) : val, z.number().min(-180).max(180)),
});

export type DirectionFormData = z.infer<typeof directionFormSchema>;

interface DestinationInfo {
  coordinates: Coordinates;
  address: string;
  name?: string;
}

export function useDirectionsForm() {
  const { flyTo } = useMapViewport();
  const { toast } = useToast();
  const { position: currentLocation } = useGeoPosition();
  const mapboxAccessToken = MAPBOX_ACCESS_TOKEN;
  const routeHandler = useMapRouteHandler();
  const { addMapboxRoute, clearRouteSelection, getRouteCoordinates, selectRoute } = routeHandler;
  const setRouteCoordinates = useTransitStore(state => state.setRouteCoordinates);
  const placeIntegration = usePlaceIntegration();
  const [isLoading, setLoading] = useState(false);
  const { mode: selectedMode } = useDirectionsMode();

  const [startAddressInputValue, setStartAddressInputValue] = useState('');
  const [startInfo, setStartInfo] = useState<DestinationInfo | null>(null);
  const [endAddressInputValue, setEndAddressInputValue] = useState('');
  const [destinationInfo, setDestinationInfo] = useState<DestinationInfo | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const form = useForm<DirectionFormData>({
    resolver: zodResolver(directionFormSchema),
    defaultValues: {
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
    const dest = getRouteCoordinates().end;
    if (dest && mapboxAccessToken) {
      reverseGeocode(dest).then(info => {
        if (info) {
          setDestinationInfo(info);
          form.setValue('endLat', dest.latitude);
          form.setValue('endLng', dest.longitude);
        }
      });
    } else {
      setDestinationInfo(null);
    }
  }, [getRouteCoordinates, mapboxAccessToken, reverseGeocode, form]);
  
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

  const handleStartAddressSelect = useCallback(async (coords: Coordinates, name?: string) => {
    // Clear any active place selection to prevent showing a popup for the start pin
    placeIntegration.clearPlaceSelection();
    form.setValue('startLat', coords.latitude);
    form.setValue('startLng', coords.longitude);
    flyTo(coords, { zoom: 18 });
    // Reverse geocode for formatted display
    if (mapboxAccessToken) {
      const info = await reverseGeocode(coords);
      if (info) {
        setStartInfo(info);
        setStartAddressInputValue(info.name || info.address);
      } else {
        setStartInfo(null);
        setStartAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
    } else {
      setStartInfo(null);
      setStartAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    }
  }, [form, flyTo, mapboxAccessToken, reverseGeocode, placeIntegration]);

  const handleDestinationAddressSelect = useCallback(async (coords: Coordinates, name?: string) => {
    form.setValue('endLat', coords.latitude);
    form.setValue('endLng', coords.longitude);
    flyTo(coords, { zoom: 18 });
    // Reverse geocode for formatted display
    if (mapboxAccessToken) {
      const info = await reverseGeocode(coords);
      if (info) {
        setDestinationInfo(info);
        setEndAddressInputValue(info.name || info.address);
      } else {
        setDestinationInfo(null);
        setEndAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
    } else {
      setDestinationInfo(null);
      setEndAddressInputValue(name || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    }
  }, [form, flyTo, mapboxAccessToken, reverseGeocode]);

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
    
    // Clear any active POI popup and search results before routing
    placeIntegration.clearPlaceSelection();
    placeIntegration.clearSearchResults();
    setLoading(true);
    try {
      const storeId = await addMapboxRoute(startCoords, endCoords, selectedMode);
      selectRoute(storeId);
    } catch (error) {
      console.error('Route calculation error:', error);
      toast({ title: "Route Error", description: Errors.getErrorMessage(error, "Unable to calculate route."), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const clearDestination = useCallback(() => {
    clearRouteSelection();
    setDestinationInfo(null);
    form.resetField('endLat');
    form.resetField('endLng');
    setEndAddressInputValue('');
  }, [clearRouteSelection, form]);

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
    isLoading,
    isReverseGeocoding,
    destinationInfo,
    clearDestination,
    startInfo,
  };
} 