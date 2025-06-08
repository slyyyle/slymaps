import { useState, useCallback } from 'react';
import type { 
  PointOfInterest, 
  ObaArrivalDeparture, 
  ObaRoute, 
  ObaStopSearchResult,
  Coordinates 
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useParameterizedFetcher } from '@/hooks/use-data-fetcher';
import { getArrivalsForStop, findNearbyTransit } from '@/services/oba';
import { getErrorMessage, isValidApiKey } from '@/lib/error-utils';
import { ONEBUSAWAY_API_KEY } from '@/lib/constants';

export function useTransitData() {
  const [obaStopsData, setObaStopsData] = useState<PointOfInterest[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [obaStopArrivals, setObaStopArrivals] = useState<ObaArrivalDeparture[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [obaReferencedRoutes, setObaReferencedRoutes] = useState<Record<string, ObaRoute>>({});

  const { toast } = useToast();

  const fetchArrivalsForStop = useParameterizedFetcher({
    fetcher: async (stopId: string) => {
      if (!isValidApiKey(ONEBUSAWAY_API_KEY)) return [];
      return getArrivalsForStop(stopId);
    },
    onSuccess: (arrivals) => {
      setObaStopArrivals(arrivals);
    },
    onError: (error) => {
      const description = getErrorMessage(error, "An unknown error occurred while fetching arrivals.");
      toast({ title: "Error Fetching Arrivals", description, variant: "destructive" });
      setObaStopArrivals([]);
    },
    setLoading: setIsLoadingArrivals,
  });

  const handleSelectPoi = useCallback((poi: PointOfInterest | null, onFlyTo?: (coords: Coordinates, zoom?: number) => void) => {
    setSelectedPoi(poi);
    if (poi?.isObaStop && poi.id) {
      fetchArrivalsForStop(poi.id);
    } else {
      setObaStopArrivals([]); 
      setIsLoadingArrivals(false);
    }
    if (poi && onFlyTo) {
      onFlyTo({latitude: poi.latitude, longitude: poi.longitude}, 18);
    }
  }, [fetchArrivalsForStop]);

  const handleStopSelect = useCallback((stop: ObaStopSearchResult, onFlyTo?: (coords: Coordinates, zoom?: number) => void) => {
    const poi: PointOfInterest = {
      id: stop.id,
      name: stop.name,
      type: 'Bus Stop',
      latitude: stop.latitude,
      longitude: stop.longitude,
      isObaStop: true,
      direction: stop.direction,
      code: stop.code,
      routeIds: stop.routeIds,
      wheelchairBoarding: stop.wheelchairBoarding,
      locationType: stop.locationType,
    };
    handleSelectPoi(poi, onFlyTo);
  }, [handleSelectPoi]);

  const handleTransitNearby = useCallback(async (coords: Coordinates) => {
    try {
      const nearbyResult = await findNearbyTransit(coords, 800);
      if (nearbyResult.stops.length > 0) {
        const newStops: PointOfInterest[] = nearbyResult.stops.map(stop => ({
          id: stop.id,
          name: stop.name,
          type: 'Bus Stop',
          latitude: stop.latitude,
          longitude: stop.longitude,
          isObaStop: true,
          direction: stop.direction,
          code: stop.code,
          routeIds: stop.routeIds,
          wheelchairBoarding: stop.wheelchairBoarding,
          locationType: stop.locationType,
        }));
        setObaStopsData(newStops);
        
        // Update referenced routes
        const newReferencedRoutes: Record<string, ObaRoute> = {};
        nearbyResult.routes.forEach(route => {
          newReferencedRoutes[route.id] = {
            id: route.id,
            shortName: route.shortName,
            longName: route.longName,
            description: route.description,
            agencyId: route.agencyId,
            url: route.url,
            color: route.color,
            textColor: route.textColor,
            type: route.type,
          };
        });
        setObaReferencedRoutes(prev => ({ ...prev, ...newReferencedRoutes }));

        toast({
          title: "Nearby Transit Found",
          description: `Found ${nearbyResult.stops.length} stops and ${nearbyResult.routes.length} routes nearby.`,
        });
      } else {
        toast({
          title: "No Nearby Transit",
          description: "No transit stops found within 800m of this location.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error finding nearby transit:', error);
      toast({
        title: "Search Error",
        description: "Could not search for nearby transit. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearTransitData = useCallback(() => {
    setObaStopsData([]);
    setSelectedPoi(null);
    setObaStopArrivals([]);
    setIsLoadingArrivals(false);
  }, []);

  return {
    // State
    obaStopsData,
    selectedPoi,
    obaStopArrivals,
    isLoadingArrivals,
    obaReferencedRoutes,
    
    // Actions
    setObaStopsData,
    setSelectedPoi,
    setObaReferencedRoutes,
    handleSelectPoi,
    handleStopSelect,
    handleTransitNearby,
    clearTransitData,
  };
} 