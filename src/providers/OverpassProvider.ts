import type { PointOfInterest } from '@/types/core';

export interface SearchParams {
  lat: number;
  lng: number;
  radius: number;
  category: string;
}

export interface ProviderResponse {
  pois: PointOfInterest[];
  hasMore: boolean;
  nextPage?: string;
}

interface RawOverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  id: number | string;
  type: string;
}

interface RawOverpassResponse {
  elements?: RawOverpassElement[];
}

export class OverpassProvider {
  private baseUrl = 'https://overpass-api.de/api/interpreter';
  private maxConcurrent = 3;
  private requestQueue: Promise<RawOverpassResponse>[] = [];

  /**
   * Fetch POIs matching category within radius around coords.
   */
  async fetchPOIs(params: SearchParams): Promise<ProviderResponse> {
    const { lat, lng, radius, category } = params;
    const query = `
[out:json][timeout:25];
(
  node["amenity"="${category}"](around:${radius},${lat},${lng});
  way["amenity"="${category}"](around:${radius},${lat},${lng});
  relation["amenity"="${category}"](around:${radius},${lat},${lng});
);
out center meta;`;

    // Rate-limit concurrent requests
    while (this.requestQueue.length >= this.maxConcurrent) {
      await Promise.race(this.requestQueue);
    }

    const req = this.makeRequest(query);
    this.requestQueue.push(req);

    try {
      const data = await req;
      return this.parseResponse(data);
    } finally {
      this.requestQueue = this.requestQueue.filter(r => r !== req);
    }
  }

  private async makeRequest(query: string): Promise<RawOverpassResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error('Overpass rate limit exceeded');
      throw new Error(`Overpass API error ${response.status}`);
    }

    return response.json();
  }

  private parseResponse(data: RawOverpassResponse): ProviderResponse {
    const pois: PointOfInterest[] = [];
    (data.elements || []).forEach((el: RawOverpassElement) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      pois.push({
        id: `overpass-${el.type}-${el.id}`,
        name: el.tags?.name || categoryLabel(el.tags),
        type: el.tags?.amenity || el.tags?.shop || 'poi',
        latitude: lat,
        longitude: lng,
        description: undefined,
        isNativePoi: false,
        properties: { tags: el.tags, osmId: el.id, osmType: el.type }
      });
    });

    return { pois, hasMore: false };
  }
}

function categoryLabel(tags: Record<string, string> = {} as Record<string, string>): string {
  return tags.name || tags.amenity || Object.values(tags)[0] || 'Unknown POI';
} 