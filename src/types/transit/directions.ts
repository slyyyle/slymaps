// === DIRECTIONS & ROUTING TYPES ===
// Types related to directions, routing, and navigation

import type { Coordinates, TransitMode } from '../core';

export interface RouteStep {
  maneuver: {
    instruction: string;
    type: string;
    modifier?: string;
    // [longitude, latitude] where the maneuver occurs
    location: [number, number];
  };
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: GeoJSON.Geometry; // GeoJSON geometry for this step
  // Optional guidance hints
  bannerInstructions?: any[];  // turn-by-turn banners (rich instructions)
  voiceInstructions?: any[];   // voice guidance snippets
}

export interface Route {
  id: string;
  geometry: GeoJSON.LineString; // GeoJSON LineString for Mapbox Directions
  legs: {
    steps: RouteStep[];
    summary: string;
    distance: number;
    duration: number;
  }[];
  distance: number; // total distance in meters
  duration: number; // total duration in seconds
  // Alternative routes (other than the primary one)
  alternatives?: Route[];
}

export interface DirectionsRequest {
  origin: Coordinates;
  destination: Coordinates;
  mode: TransitMode;
  alternatives?: boolean;
  steps?: boolean;
}

export interface DirectionsState {
  origin: Coordinates | null;
  destination: Coordinates | null;
  route: Route | null;
  isLoading: boolean;
  error: string | null;
} 