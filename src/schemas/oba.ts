import { z } from 'zod';

// ----- Stop Search Result -----
export const ObaStopSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  direction: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  routeIds: z.array(z.string()),
  routes: z
    .array(
      z.object({
        id: z.string(),
        shortName: z.string(),
        longName: z.string().optional(),
        description: z.string().optional(),
        agencyId: z.string(),
        url: z.string().optional(),
        color: z.string().optional(),
        textColor: z.string().optional(),
        type: z.number().optional(),
      })
    )
    .optional(),
  wheelchairBoarding: z.string().optional(),
  locationType: z.number().optional(),
});
export type ObaStopSearchResult = z.infer<typeof ObaStopSearchResultSchema>;

// ----- Route Search Result -----
export const ObaRouteSearchResultSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  longName: z.string().optional(),
  description: z.string().optional(),
  agencyId: z.string(),
  agencyName: z.string().optional(),
  url: z.string().optional(),
  color: z.string().optional(),
  textColor: z.string().optional(),
  type: z.number().optional(),
});
export type ObaRouteSearchResult = z.infer<typeof ObaRouteSearchResultSchema>;

// ----- Nearby Search Result -----
export const ObaNearbySearchResultSchema = z.object({
  stops: z.array(ObaStopSearchResultSchema),
  routes: z.array(ObaRouteSearchResultSchema),
  searchLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number(),
  }),
});
export type ObaNearbySearchResult = z.infer<typeof ObaNearbySearchResultSchema>;

// ----- Route Geometry -----
export const ObaRouteGeometrySchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  properties: z.object({
    routeId: z.string(),
    segmentIndex: z.number().optional(),
  }),
});
export type ObaRouteGeometry = z.infer<typeof ObaRouteGeometrySchema>;

// ----- Route Details -----
export const ObaRouteSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  longName: z.string().optional(),
  description: z.string().optional(),
  agencyId: z.string(),
  agency: z
    .object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      timezone: z.string(),
      lang: z.string().optional(),
      phone: z.string().optional(),
      fareUrl: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  url: z.string().optional(),
  color: z.string().optional(),
  textColor: z.string().optional(),
  type: z.number().optional(),
});
export type ObaRoute = z.infer<typeof ObaRouteSchema>;

// ----- Vehicle Location -----
export const ObaVehicleLocationSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number().optional(),
  tripId: z.string().optional(),
  tripHeadsign: z.string().optional(),
  lastUpdateTime: z.number().optional(),
  phase: z.string().nullable().optional(),
  predicted: z.boolean().optional(),
  scheduleDeviation: z.number().nullable().optional(),
  closestStopId: z.string().nullable().optional(),
  closestStopTimeOffset: z.number().nullable().optional(),
  nextStopId: z.string().nullable().optional(),
  nextStopTimeOffset: z.number().nullable().optional(),
  distanceAlongTrip: z.number().nullable().optional(),
  totalDistanceAlongTrip: z.number().nullable().optional(),
});
export type ObaVehicleLocation = z.infer<typeof ObaVehicleLocationSchema>;

// ----- Schedule Entry -----
export const ObaScheduleEntrySchema = z.object({
  serviceId: z.string(),
  tripId: z.string(),
  routeId: z.string(),
  stopTimes: z.array(
    z.object({
      stopId: z.string(),
      arrivalTime: z.number(),
      departureTime: z.number(),
    })
  ),
  direction: z.string(),
  headsign: z.string(),
});
export type ObaScheduleEntry = z.infer<typeof ObaScheduleEntrySchema>;

// ----- Stop Schedule With Refs -----
export const ObaStopScheduleWithRefsSchema = z.object({
  entry: z.object({
    stopId: z.string(),
    date: z.union([z.string(), z.number()]).transform(d => String(d)),
    stopRouteSchedules: z.array(
      z.object({
        routeId: z.string(),
        stopRouteDirectionSchedules: z.array(
          z.object({
            scheduleFrequencies: z.array(z.any()).optional(),
            scheduleStopTimes: z.array(
              z.object({
                tripId: z.string(),
                serviceId: z.string(),
                arrivalTime: z.number(),
                departureTime: z.number(),
              })
            ),
          })
        ),
      })
    ),
  }),
  references: z
    .object({
      agencies: z.array(z.any()).optional(),
      routes: z.array(ObaRouteSchema).optional(),
      stops: z.array(z.any()).optional(),
      trips: z.array(z.any()).optional(),
      situations: z.array(z.any()).optional(),
    })
    .optional(),
});
export type ObaStopScheduleWithRefs = z.infer<typeof ObaStopScheduleWithRefsSchema>; 