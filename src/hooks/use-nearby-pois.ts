import { useQuery } from '@tanstack/react-query';
import { usePlaceStore } from '@/stores/use-place-store';
import { OverpassProvider, SearchParams as OverpassParams } from '@/providers/OverpassProvider';
import { OneBusAwayProvider } from '@/providers/OneBusAwayProvider';
import type { Place } from '@/types/core';

// Initialize providers once
const overpass = new OverpassProvider();
const oba = new OneBusAwayProvider(
  process.env.NEXT_PUBLIC_OBA_URL || '',
  process.env.NEXT_PUBLIC_OBA_KEY || ''
);

type NearbyParams = OverpassParams;

function dedupePOIs(pois: Place[]): Place[] {
  const map = new Map<string, Place>();
  pois.forEach(poi => {
    if (!map.has(poi.id)) map.set(poi.id, poi);
  });
  return Array.from(map.values());
}

/**
 * Fetch nearby POIs (Overpass + OneBusAway) with React-Query
 */
export function useFetchNearbyPOIs(
  params: OverpassParams
) {
  const { getNearbyCache, setNearbyCache } = usePlaceStore();
  return useQuery<Place[], Error>({
    queryKey: ['nearby-pois', params],
    queryFn: async () => {
      const cached = getNearbyCache(params);
      if (cached) return cached;
      const results = await Promise.allSettled([
        overpass.fetchPOIs(params),
        oba.fetchPOIs(params)
      ]);
      let all: Place[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          all.push(...r.value.pois);
        }
      });
      const unique = dedupePOIs(all);
      setNearbyCache(params, unique);
      return unique;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

// Deprecated: use useFetchNearbyPOIs instead
/** @deprecated */
export const useNearbyPOIs = useFetchNearbyPOIs; 