import type { UseQueryResult } from '@tanstack/react-query';
import type { ObaStopScheduleWithRefs } from '@/schemas/oba';
import { useFetchStopSchedule } from '@/hooks/data/use-transit-queries';

/**
 * Hook to fetch OBA stop schedule along with references (agencies, routes, etc.)
 * @param stopId - The OBA stop ID to fetch schedule for.
 */
export function useStopSchedule(stopId: string | null): UseQueryResult<ObaStopScheduleWithRefs, Error> {
  return useFetchStopSchedule(stopId || '');
} 