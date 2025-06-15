// === ONEBUSAWAY (OBA) TYPES ===
// Types related to OneBusAway transit API

import type { PointOfInterest } from './core';

export interface ObaArrivalDeparture {
  routeId: string;
  routeShortName: string;
  tripId: string;
  tripHeadsign: string;
  stopId: string;
  scheduledArrivalTime: number; // epoch time
  predictedArrivalTime: number | null; // epoch time, null if no prediction
  status?: string; // e.g. "scheduled", "canceled", "delayed"
  vehicleId?: string;
  distanceFromStop?: number; // in meters
  lastUpdateTime?: number; // epoch time
}

export interface ObaPolyline {
  points: string; // Encoded polyline string
  length: number;
}

// For GeoJSON rendering of OBA route paths
export interface ObaRouteGeometry {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: number[][]; // Array of [lon, lat]
  };
  properties: {
    routeId: string;
    segmentIndex?: number; // optional index of segment
  };
}

export interface ObaAgency {
  id: string;
  name: string;
  url: string;
  timezone: string;
  lang?: string;
  phone?: string;
  fareUrl?: string;
  email?: string;
}

export interface ObaRoute {
  id: string;
  shortName: string;
  longName?: string;
  description?: string;
  agencyId: string;
  agency?: ObaAgency; // Optional, if full reference is included
  url?: string;
  color?: string;
  textColor?: string;
  type?: number; // OBA route type (e.g., 3 for Bus)
}

export interface CurrentOBARouteDisplayData {
  routeInfo: ObaRoute;
  stops: PointOfInterest[];
}

export interface ObaVehicleLocation {
  id: string; // Vehicle ID
  routeId: string;
  latitude: number;
  longitude: number;
  heading?: number; // Optional, in degrees from North
  tripId?: string;
  tripHeadsign?: string;
  lastUpdateTime?: number; // epoch time
  phase?: string; // e.g., IN_PROGRESS
}

export interface ObaTrip {
  id: string;
  routeId: string;
  serviceId: string;
  headsign: string;
  direction: string;
}

export interface ObaSituation {
  id: string;
  summary: string;
  description?: string;
  affects?: {
    stopIds?: string[];
    routeIds?: string[];
  };
}

// For the references section of OBA API responses
export interface ObaReferences {
  agencies: ObaAgency[];
  routes: ObaRoute[];
  stops: PointOfInterest[];
  trips: ObaTrip[];
  situations: ObaSituation[];
}

export interface ObaRouteSearchResult {
  id: string;
  shortName: string;
  longName?: string;
  description?: string;
  agencyId: string;
  agencyName?: string;
  url?: string;
  color?: string;
  textColor?: string;
  type?: number;
}

export interface ObaStopSearchResult {
  id: string;
  name: string;
  code: string;
  direction?: string;
  latitude: number;
  longitude: number;
  routeIds: string[];
  routes?: ObaRouteSearchResult[];
  wheelchairBoarding?: string;
  locationType?: number;
}

export interface ObaNearbySearchResult {
  stops: ObaStopSearchResult[];
  routes: ObaRouteSearchResult[];
  searchLocation: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface UnifiedSearchSuggestion {
  type: 'route' | 'stop' | 'location' | 'place';
  id: string;
  title: string;
  subtitle?: string;
  data: ObaRouteSearchResult | ObaStopSearchResult | Record<string, unknown>;
}

// OBA Schedule and Trip API response types
export interface ObaScheduleEntry {
  serviceId: string;
  tripId: string;
  routeId: string;
  stopTimes: Array<{
    stopId: string;
    arrivalTime: number;
    departureTime: number;
  }>;
  direction: string;
  headsign: string;
}

export interface ObaTripDetails {
  tripId: string;
  routeId: string;
  serviceId: string;
  shapeId?: string;
  tripHeadsign: string;
  direction: string;
  stopTimes: Array<{
    stopId: string;
    arrivalTime: number;
    departureTime: number;
    stopSequence: number;
  }>;
}

export interface ObaStopSchedule {
  stopId: string;
  date: string;
  stopRouteSchedules: Array<{
    routeId: string;
    stopRouteDirectionSchedules: Array<{
      // May include frequency-based scheduling information
      scheduleFrequencies?: Array<Record<string, unknown>>;
      // The actual stop times for this direction
    scheduleStopTimes: Array<{
      tripId: string;
      serviceId: string;
      arrivalTime: number;
      departureTime: number;
    }>;
  }>;
  }>;
}

// Extended schedule result including API references
export interface ObaStopScheduleWithRefs {
  entry: ObaStopSchedule;
  references?: {
    agencies?: ObaAgency[];
    routes?: ObaRoute[];
    stops?: any[];
    trips?: any[];
    situations?: any[];
  };
} 