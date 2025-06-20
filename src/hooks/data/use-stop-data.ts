import { useQuery } from '@tanstack/react-query';
import { getStopDetails } from '@/services/oba';
import type { ObaStopSearchResult } from '@/types/transit/oba';

/**
 * Hook to fetch stop information by stop ID
 */
export function useStopData(stopId: string | null | undefined) {
  return useQuery({
    queryKey: ['stop', stopId],
    queryFn: async (): Promise<ObaStopSearchResult | null> => {
      if (!stopId) {
        throw new Error('Stop ID is required');
      }
      
      const response = await getStopDetails(stopId);
      return response;
    },
    enabled: !!stopId,
    staleTime: 5 * 60 * 1000, // 5 minutes - stop info doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 