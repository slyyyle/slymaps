import { useFetchStopSchedule } from '@/hooks/data/use-transit-queries';
import { useMemo } from 'react';
import type { ObaStopScheduleWithRefs, ObaArrivalDeparture } from '@/types/transit/oba';

/**
 * Hook to fetch and flatten stop schedule into a list of upcoming arrivals
 */
export function useStopArrivals(stopId: string | null) {
  const scheduleQuery = useFetchStopSchedule(stopId || '');

  const arrivals = useMemo<ObaArrivalDeparture[]>(() => {
    if (scheduleQuery.data?.entry) {
      const now = Date.now();
      const horizon = now + 3 * 60 * 60 * 1000;
      const entry = scheduleQuery.data.entry;
      // Flatten all direction schedules, using references to pick the true shortName if available
      const refs = scheduleQuery.data.references?.routes ?? [];
      const allArrivals = entry.stopRouteSchedules.flatMap(routeSched => {
        const refRoute = refs.find(r => r.id === routeSched.routeId);
        const shortName = refRoute?.shortName ?? routeSched.routeId.split('_')[1] ?? routeSched.routeId;
        return routeSched.stopRouteDirectionSchedules.flatMap(dirSched =>
          dirSched.scheduleStopTimes.map(st => ({
            routeId: routeSched.routeId,
            routeShortName: shortName,
            tripId: st.tripId,
            tripHeadsign: '',
            stopId: entry.stopId,
            scheduledArrivalTime: st.arrivalTime,
            predictedArrivalTime: null,
            status: 'scheduled',
            vehicleId: undefined,
            distanceFromStop: undefined,
            lastUpdateTime: undefined
          } as ObaArrivalDeparture))
        );
      });
      // Filter and sort
      return allArrivals
        .filter(a => {
          const useTime = a.predictedArrivalTime || a.scheduledArrivalTime;
          return useTime >= now && useTime <= horizon;
        })
        .sort((a, b) => {
          const ta = a.predictedArrivalTime || a.scheduledArrivalTime;
          const tb = b.predictedArrivalTime || b.scheduledArrivalTime;
          return ta - tb;
        });
    }
    return [];
  }, [scheduleQuery.data]);

  return {
    scheduleQuery,
    arrivals,
  };
} 