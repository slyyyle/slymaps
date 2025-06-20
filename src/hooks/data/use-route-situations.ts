import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSituationsForRouteFromReferences } from '@/services/oba';
import { rateLimitedRequest } from '@/lib/api';
import { isValidApiKey } from '@/lib/errors';
import { ONEBUSAWAY_API_KEY } from '@/lib/constants';
import type { ObaSituation } from '@/types/transit/oba';

/**
 * Hook to fetch service alerts (situations) for a specific route
 * Uses the stops-for-route API which includes situations in references
 */
export function useFetchRouteSituations(routeId: string) {
  const stopsForRouteQuery = useQuery({
    queryKey: ['transit', 'stopsForRoute', routeId],
    queryFn: async () => {
      if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
        throw new Error('OneBusAway API key is required');
      }
      
      // Strip any store prefix from route ID
      const effectiveRouteId = routeId.startsWith('oba-') ? routeId.slice(4) : routeId;
      
      return await rateLimitedRequest(async () => {
        const baseUrl = 'https://api.pugetsound.onebusaway.org/api/where';
        const response = await fetch(`${baseUrl}/stops-for-route/${effectiveRouteId}.json?key=${ONEBUSAWAY_API_KEY}&includeReferences=true`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch route data: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data?.references || {};
      }, `route situations for ${routeId}`);
    },
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000,
  });
  
  const situations = useMemo<ObaSituation[]>(() => {
    if (!stopsForRouteQuery.data || !routeId) {
      return [];
    }
    
    // Strip any store prefix from route ID
    const effectiveRouteId = routeId.startsWith('oba-') ? routeId.slice(4) : routeId;
    
    return getSituationsForRouteFromReferences(
      stopsForRouteQuery.data,
      effectiveRouteId
    );
  }, [stopsForRouteQuery.data, routeId]);

  return {
    data: situations,
    isLoading: stopsForRouteQuery.isLoading,
    isError: stopsForRouteQuery.isError,
    error: stopsForRouteQuery.error,
    refetch: stopsForRouteQuery.refetch,
  };
} 