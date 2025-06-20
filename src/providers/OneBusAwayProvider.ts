import type { Place } from '@/types/core';
import { OneBusAwayResponseSchema } from '@/schemas/onebusaway';

export interface SearchParams {
  lat: number;
  lng: number;
  radius: number;
  category: string;
}

export interface ProviderResponse {
  pois: Place[];
  hasMore: boolean;
  nextPage?: string;
}

interface OBAStop {
  id: number | string;
  name?: string;
  code?: string;
  lat: number;
  lon: number;
  routeIds?: string[];
  direction?: string;
  wheelchairBoarding?: boolean;
}

/**
 * Provider for OneBusAway stops near a location
 */
export class OneBusAwayProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Fetch nearby stops as POIs
   */
  async fetchPOIs(params: SearchParams): Promise<ProviderResponse> {
    const { lat, lng, radius } = params;
    // Approximate degree span for lat/lng
    const latSpan = radius / 111320;
    const lonSpan = radius / (111320 * Math.cos(lat * Math.PI / 180));

    const url = `${this.baseUrl}/stops-for-location.json?` +
      `lat=${lat}&lon=${lng}` +
      `&latSpan=${latSpan}&lonSpan=${lonSpan}` +
      `&key=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OneBusAway API error ${res.status}`);
    const raw = await res.json();
    // Validate raw JSON
    const validated = OneBusAwayResponseSchema.parse(raw);
    const list = validated.data.list || [];

    const pois: Place[] = list.map((stop: OBAStop) => ({
      id: `oba-${stop.id}`,
      name: stop.name || stop.code || 'Bus Stop',
      type: 'Transit Stop',
      latitude: stop.lat,
      longitude: stop.lon,
      isObaStop: true,
      code: stop.code,
      routeIds: stop.routeIds,
      description: stop.direction,
      wheelchairBoarding: stop.wheelchairBoarding != null ? stop.wheelchairBoarding.toString() : undefined,
      properties: { stopId: stop.id }
    }));

    return { pois, hasMore: false };
  }
} 