
export interface PointOfInterest {
  id: string;
  name: string;
  type: string; // e.g., Restaurant, Bar, Venue, Park, Shop, Bus Stop
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
  dataAiHint?: string;
  // OBA specific fields
  isObaStop?: boolean;
  direction?: string; // e.g., "N", "S", "W", "E", "NB", "SB"
  code?: string; // Stop code
  routeIds?: string[]; // List of route IDs serving this stop
  locationType?: number; // OBA specific: 0 for stop, 1 for station
  wheelchairBoarding?: string; // OBA specific
}

export interface CustomPOI extends PointOfInterest {
  isCustom: true;
  address?: string; // For user-added POIs
}

export interface MapStyle {
  id: string;
  name: string;
  url: string;
}

export interface RouteStep {
  maneuver: {
    instruction: string;
    type: string;
    modifier?: string;
  };
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: any; // GeoJSON geometry for this step
}

export interface Route {
  id: string;
  geometry: any; // GeoJSON LineString for Mapbox Directions
  legs: {
    steps: RouteStep[];
    summary: string;
    distance: number;
    duration: number;
  }[];
  distance: number; // total distance in meters
  duration: number; // total duration in seconds
}

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type TransitMode = 'driving-traffic' | 'walking' | 'cycling' | 'transit';

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
  };
}

export interface ObaRoute {
  id: string;
  shortName: string;
  longName?: string;
  description?: string;
  agencyId: string;
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
