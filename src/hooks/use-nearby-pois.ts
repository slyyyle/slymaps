import { useQuery } from '@tanstack/react-query';
import { usePOIStore } from '@/stores/use-poi-store';
import { OverpassProvider, SearchParams as OverpassParams } from '@/providers/OverpassProvider';
import { OneBusAwayProvider } from '@/providers/OneBusAwayProvider';
import type { PointOfInterest } from '@/types/core';

// Initialize providers once
const overpass = new OverpassProvider();
const oba = new OneBusAwayProvider(
  process.env.NEXT_PUBLIC_OBA_URL || '',
  process.env.NEXT_PUBLIC_OBA_KEY || ''
);

type NearbyParams = OverpassParams;

function dedupePOIs(pois: PointOfInterest[]): PointOfInterest[] {
  const map = new Map<string, PointOfInterest>();
  pois.forEach(poi => {
    if (!map.has(poi.id)) map.set(poi.id, poi);
  });
  return Array.from(map.values());
}

/**
 * Hook to fetch and cache nearby POIs for given coords, radius, and category.
 */
export function useNearbyPOIs(
  params: NearbyParams
) {
  const { getNearbyCache, setNearbyCache } = usePOIStore();

  return useQuery<PointOfInterest[], Error>(
    ['nearby-pois', params],
    async () => {
      // Try cache
      const cached = getNearbyCache(params);
      if (cached) return cached;

      // Fetch from providers in parallel
      const results = await Promise.allSettled([
        overpass.fetchPOIs(params),
        oba.fetchPOIs(params)
      ]);

      // Collect successful POIs
      let all: PointOfInterest[] = [];
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          all.push(...r.value.pois);
        }
      });

      // Dedupe and cache
      const unique = dedupePOIs(all);
      setNearbyCache(params, unique);
      return unique;
    },
    {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000)
    }
  );
} 