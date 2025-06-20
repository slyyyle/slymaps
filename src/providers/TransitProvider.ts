import type { Coordinates, Place } from '@/types/core';
import type { ObaVehicleLocation, ObaRoute, ObaRouteGeometry, ObaStopScheduleWithRefs, ObaNearbySearchResult, ObaScheduleEntry } from '@/types/transit/oba';
import { findNearbyTransit, getRouteDetails, getVehiclesForRoute, getStopSchedule, getScheduleForRoute } from '@/services/oba';
import { ObaNearbySearchResultSchema, ObaVehicleLocationSchema, ObaScheduleEntrySchema, ObaStopScheduleWithRefsSchema } from '@/schemas/oba';

// Branch type for route details
export interface Branch {
  branchIdx: number;
  name: string;
  segments: ObaRouteGeometry[];
  stops: Place[];
}

export interface TransitProvider {
  // Find nearby stops and reference routes
  fetchNearbyTransit: (coords: Coordinates, radiusMeters?: number) => Promise<ObaNearbySearchResult>;
  // Get full route info including branches and shape segments
  fetchRouteDetails: (routeId: string) => Promise<{ routeInfo: ObaRoute | null; branches: Branch[] }>;
  // Get real-time vehicle locations for a route
  fetchVehiclesForRoute: (routeId: string) => Promise<ObaVehicleLocation[]>;
  // Get scheduled arrivals and references for a stop
  fetchStopSchedule: (stopId: string) => Promise<ObaStopScheduleWithRefs>;
  // Get schedule entries for a route
  fetchRouteSchedule: (routeId: string) => Promise<ObaScheduleEntry>;
}

// Default implementation using OBA services
export const TransitProviderImpl: TransitProvider = {
  fetchNearbyTransit: async (coords, radiusMeters) => {
    const data = await findNearbyTransit(coords, radiusMeters);
    return ObaNearbySearchResultSchema.parse(data);
  },
  fetchRouteDetails: async (routeId) => {
    const detailed = await getRouteDetails(routeId);
    return { routeInfo: detailed.routeInfo, branches: detailed.branches };
  },
  fetchVehiclesForRoute: async (routeId) => {
    const vehicles = await getVehiclesForRoute(routeId);
    return ObaVehicleLocationSchema.array().parse(vehicles);
  },
  fetchStopSchedule: async (stopId) => {
    const schedule = await getStopSchedule(stopId);
    return ObaStopScheduleWithRefsSchema.parse(schedule);
  },
  fetchRouteSchedule: async (routeId) => {
    const schedule = await getScheduleForRoute(routeId);
    return ObaScheduleEntrySchema.parse(schedule);
  }
}; 