import { otpClient, PLAN_QUERY } from '@/api/otpClient';
import type { Coordinates } from '@/types/core';
import { OTP_BASE_URL } from '@/lib/constants';

export interface OTPPlanRequest {
  from: Coordinates;
  to: Coordinates;
  modes?: string; // e.g. "TRANSIT,WALK"
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM:SS
  arriveBy?: boolean;
  numItineraries?: number;
}

export interface OTPLeg {
  mode: string;            // "WALK", "BUS", "RAIL", etc.
  startTime: number;       // epoch ms
  endTime: number;         // epoch ms
  distance: number;        // meters
  duration: number;        // seconds
  legGeometry: {
    points: string;        // encoded polyline
    length: number;        // number of vertices or length indicator
  };
  // route and agency details
  route?: {
    gtfsId?: string;
    shortName?: string;
    longName?: string;
    agency?: { name?: string };
  };
  from: { name: string; lat: number; lon: number; };
  to: { name: string; lat: number; lon: number; };
  headsign?: string;
}

export interface OTPItinerary {
  duration: number;            // seconds
  legs: OTPLeg[];
  start: number;               // epoch ms
  end: number;                 // epoch ms
  walkTime: number;            // seconds
  waitingTime: number;         // seconds
  walkDistance: number;        // meters
  numberOfTransfers: number;
}

export interface OTPPlanResponse {
  plan?: {
    itineraries: OTPItinerary[];
    from: { name: string; lat: number; lon: number; };
    to: { name: string; lat: number; lon: number; };
    date: number; // epoch ms
  };
  error?: {
    id: number;
    msg: string;
    message: string;
  };
}

export async function planTransit(
  start: Coordinates,
  end: Coordinates,
  options: Partial<{ date: string; time: string }> = {}
): Promise<OTPItinerary | null> {
  // Default to local date and time (Pacific) with seconds precision
  const now = new Date();
  const localDate = [
    now.getFullYear().toString().padStart(4, '0'),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0')
  ].join('-');
  const localTime = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join(':');
  const date = options.date || localDate;
  const time = options.time || localTime;

  // Prepare GraphQL variables
  const variables = {
    from: { lat: start.latitude, lon: start.longitude },
    to:   { lat: end.latitude,   lon: end.longitude },
    date,
    time
  };

  try {
    const data = await otpClient.request<{ plan: { itineraries: OTPItinerary[] } }>(PLAN_QUERY, variables);
    const itins = data.plan?.itineraries;
    if (!itins || itins.length === 0) {
      console.warn('No transit itineraries returned from OTP');
      return null;
    }
    return itins[0];
  } catch (error) {
    console.error('Error calling OTP GraphQL plan:', error);
    return null;
  }
} 