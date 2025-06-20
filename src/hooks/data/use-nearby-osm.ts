import { useQuery } from '@tanstack/react-query';
import { useOSMData } from '@/hooks/data/use-osm-data';
import type { OSMPoiData } from '@/schemas/osm';

/**
 * Hook to fetch and cache nearby OSM POIs around specified coordinates.
 * @param latitude - Center latitude for Overpass search.
 * @param longitude - Center longitude for Overpass search.
 * @param radius - Search radius in meters (default 200m).
 */
export function useNearbyOSM(latitude: number, longitude: number, radius: number = 200) {
  const { fetchNearbyOSMPois } = useOSMData();

  return useQuery<OSMPoiData[], Error>({
    queryKey: ['osm-nearby-pois', latitude, longitude, radius],
    queryFn: () => fetchNearbyOSMPois(latitude, longitude, radius),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });
} 