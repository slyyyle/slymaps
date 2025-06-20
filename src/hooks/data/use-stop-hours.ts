import { useQuery } from '@tanstack/react-query';
import { osmService } from '@/services/osm-service';
import type { OSMPoiData } from '@/schemas/osm';

/**
 * Hook to fetch and cache opening hours and contact info for a POI via OSM.
 * @param name - The name of the POI to match in OSM.
 * @param latitude - The latitude of the POI.
 * @param longitude - The longitude of the POI.
 */
export function useStopHours(name: string, latitude: number, longitude: number) {
  return useQuery<OSMPoiData | null, Error>({
    queryKey: ['osm-poi-match', name, latitude, longitude],
    queryFn: () => osmService.findMatchingPOI(name, latitude, longitude),
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
} 