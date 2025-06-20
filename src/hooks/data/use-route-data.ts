import { useFetchRouteDetails, useFetchVehicles, useFetchRouteSchedule } from '@/hooks/data/use-transit-queries';

/**
 * Hook to retrieve all route-related data for a given route ID:
 * - GeoJSON segments and branch info
 * - Real-time vehicle locations
 * - Scheduled arrival entries
 */
export function useRouteData(routeId: string | null) {
  const detailsQuery = useFetchRouteDetails(routeId || '');
  const vehiclesQuery = useFetchVehicles(routeId || '');
  const scheduleQuery = useFetchRouteSchedule(routeId || '');

  return {
    detailsQuery,
    vehiclesQuery,
    scheduleQuery,
  };
} 