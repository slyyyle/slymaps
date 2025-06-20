import { useMemo } from 'react';
import { useFetchStopSchedule } from '@/hooks/data/use-transit-queries';
import { getSituationsForStopFromReferences } from '@/services/oba';
import type { ObaSituation } from '@/types/transit/oba';

/**
 * Hook to fetch service alerts (situations) for a specific stop
 * Extracts situations from the stop schedule API response references
 */
export function useFetchStopSituations(stopId: string) {
  const stopScheduleQuery = useFetchStopSchedule(stopId || '');
  
  const situations = useMemo<ObaSituation[]>(() => {
    if (!stopScheduleQuery.data?.references || !stopId) {
      return [];
    }
    
    return getSituationsForStopFromReferences(
      stopScheduleQuery.data.references, 
      stopId
    );
  }, [stopScheduleQuery.data?.references, stopId]);

  return {
    data: situations,
    isLoading: stopScheduleQuery.isLoading,
    isError: stopScheduleQuery.isError,
    error: stopScheduleQuery.error,
    refetch: stopScheduleQuery.refetch,
  };
} 