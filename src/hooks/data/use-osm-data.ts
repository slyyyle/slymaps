import { useQueryClient } from '@tanstack/react-query';
import { osmService } from '@/services/osm-service';
import type { OSMPoiData } from '@/schemas/osm';

/**
 * Hook to fetch and cache OSM POI data
 */
export function useOSMData() {
  const queryClient = useQueryClient();

  /**
   * Fetch nearby OSM POIs via Overpass
   */
  const fetchNearbyOSMPois = (lat: number, lon: number, radius: number = 50) => {
    return queryClient.fetchQuery<OSMPoiData[], Error>({
      queryKey: ['osm-nearby-pois', lat, lon, radius],
      queryFn: () => osmService.fetchPOIData(lat, lon, radius),
      staleTime: 5 * 60 * 1000,
    });
  };

  /**
   * Find the best matching OSM POI by name and location
   * Uses a separate cache key from the popup to avoid conflicts
   */
  const findMatchingPOI = (name: string, lat: number, lon: number) => {
    return queryClient.fetchQuery<OSMPoiData | null, Error>({
      queryKey: ['osm-poi-enrichment', name, lat, lon],
      queryFn: () => osmService.findMatchingPOI(name, lat, lon),
      staleTime: 60 * 60 * 1000,
    });
  };

  /**
   * Geocode an address string via Nominatim
   */
  const geocode = (address: string) => osmService.geocodeAddress(address);

  /**
   * Reverse geocode coordinates via Nominatim
   */
  const reverseGeocode = (lat: number, lon: number) => osmService.reverseGeocode(lat, lon);

  return { fetchNearbyOSMPois, findMatchingPOI, geocode, reverseGeocode };
} 