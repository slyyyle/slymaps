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
  geometry: any; // GeoJSON LineString
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
