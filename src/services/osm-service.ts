// OpenStreetMap Overpass API Service
// Fetches real POI data to replace mock data

import type { AddressInput } from '@/utils/address-utils';
import { OSMPoiDataSchema } from '@/schemas/osm';

export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

export interface OSMPoiData {
  name?: string;
  category?: string;
  subclass?: string;
  opening_hours?: string;
  phone?: string;
  website?: string;
  operator?: string;
  brand?: string;
  address?: AddressInput;
  cuisine?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
  coordinates: { lat: number; lon: number };
}

export interface NominatimPlace {
  place_id: string;
  licence: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: string;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: string;
  importance: string;
  addresstype: string;
  name?: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string]; // [min_lat, max_lat, min_lon, max_lon]
}

export interface GeocodingResult {
  coordinates: { lat: number; lon: number };
  display_name: string;
  address?: AddressInput;
  place_id: string;
  type: string;
  importance: number;
}

class OSMService {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';
  private nominatimUrl = 'https://nominatim.openstreetmap.org';
  
  /**
   * Build Overpass QL query to get POI data around coordinates
   */
  private buildQuery(lat: number, lon: number, radius: number = 50): string {
    return `
      [out:json][timeout:25];
      (
        node["name"]["amenity"](around:${radius},${lat},${lon});
        node["name"]["shop"](around:${radius},${lat},${lon});
        node["name"]["tourism"](around:${radius},${lat},${lon});
        node["name"]["leisure"](around:${radius},${lat},${lon});
        way["name"]["amenity"](around:${radius},${lat},${lon});
        way["name"]["shop"](around:${radius},${lat},${lon});
        way["name"]["tourism"](around:${radius},${lat},${lon});
        way["name"]["leisure"](around:${radius},${lat},${lon});
      );
      out center;
    `;
  }

  /**
   * Normalize OSM tags to our POI format
   */
  private async normalizeOSMData(element: OSMElement): Promise<OSMPoiData | null> {
    const tags = element.tags || {};
    const name = tags.name;
    
    if (!name) return null;

    // Get coordinates
    let coordinates: { lat: number; lon: number };
    if (element.type === 'node' && element.lat && element.lon) {
      coordinates = { lat: element.lat, lon: element.lon };
    } else if (element.center) {
      coordinates = element.center;
    } else {
      return null;
    }

    // Determine category and subclass
    let category = 'place';
    let subclass = '';

    if (tags.amenity) {
      category = this.mapAmenityToCategory(tags.amenity);
      subclass = tags.amenity;
    } else if (tags.shop) {
      category = 'store';
      subclass = tags.shop;
    } else if (tags.tourism) {
      category = tags.tourism;
      subclass = tags.tourism;
    } else if (tags.leisure) {
      category = 'entertainment';
      subclass = tags.leisure;
    }

    // Build structured address input
    const rawAddress: AddressInput = {
      house_number: tags['addr:housenumber'],
      road: tags['addr:street'],
      neighbourhood: tags['addr:neighbourhood'],
      suburb: tags['addr:suburb'],
      city: tags['addr:city'],
      county: tags['addr:county'],
      state: tags['addr:state'],
      postcode: tags['addr:postcode'],
      country: tags['addr:country'],
      country_code: tags['addr:country_code'],
    };
    const hasRaw = Object.values(rawAddress).some((v) => Boolean(v));
    
    let address: AddressInput;
    if (hasRaw) {
      address = rawAddress;
    } else {
      // Use reverse geocoding to get address when structured data is not available
      try {
        const geocodeResult = await this.reverseGeocode(coordinates.lat, coordinates.lon);
        if (geocodeResult?.address) {
          address = geocodeResult.address;
        } else {
          // Fallback to coordinates if reverse geocoding fails
          address = `${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
        }
      } catch (error) {
        console.warn('Reverse geocoding failed for POI:', name, error);
        address = `${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
      }
    }

    return {
      name,
      category,
      subclass,
      opening_hours: tags.opening_hours,
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      operator: tags.operator,
      brand: tags.brand,
      address,
      cuisine: tags.cuisine,
      amenity: tags.amenity,
      shop: tags.shop,
      tourism: tags.tourism,
      coordinates
    };
  }

  /**
   * Map OSM amenity tags to our category system
   */
  private mapAmenityToCategory(amenity: string): string {
    const mapping: Record<string, string> = {
      // Food & Drink
      'restaurant': 'restaurant',
      'cafe': 'cafe',
      'bar': 'bar',
      'pub': 'bar',
      'fast_food': 'fast_food',
      'food_court': 'food_court',
      'ice_cream': 'cafe',
      'bakery': 'cafe',
      
      // Services
      'bank': 'bank',
      'atm': 'atm',
      'fuel': 'gas_station',
      'charging_station': 'gas_station',
      'pharmacy': 'pharmacy',
      'hospital': 'hospital',
      'clinic': 'hospital',
      'dentist': 'hospital',
      'veterinary': 'hospital',
      
      // Transportation
      'bus_station': 'bus_station',
      'parking': 'parking',
      'taxi': 'taxi_stand',
      
      // Entertainment
      'cinema': 'cinema',
      'theatre': 'theater',
      'library': 'library',
      
      // Education
      'school': 'school',
      'university': 'university',
      'college': 'university',
      'kindergarten': 'school',
      
      // Default
      'place_of_worship': 'place'
    };
    
    return mapping[amenity] || amenity;
  }

  /**
   * Geocode address to coordinates using Nominatim
   */
  async geocodeAddress(address: string): Promise<GeocodingResult[]> {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5'
      });

      const response = await fetch(`${this.nominatimUrl}/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data: NominatimPlace[] = await response.json();
      
      return data.map(place => ({
        coordinates: {
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon)
        },
        display_name: place.display_name,
        address: place.address,
        place_id: place.place_id,
        type: place.type,
        importance: parseFloat(place.importance)
      }));
      
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address using Nominatim
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'jsonv2',
        addressdetails: '1'
      });

      const response = await fetch(`${this.nominatimUrl}/reverse?${params}`);
      
      if (!response.ok) {
        throw new Error(`Nominatim reverse API error: ${response.status}`);
      }

      const place: NominatimPlace = await response.json();
      
      return {
        coordinates: { lat, lon },
        display_name: place.display_name,
        address: place.address,
        place_id: place.place_id,
        type: place.type,
        importance: parseFloat(place.importance)
      };
      
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Fetch POI data around specific coordinates
   */
  async fetchPOIData(lat: number, lon: number, radius: number = 50): Promise<OSMPoiData[]> {
    // Use AbortController to enforce a timeout in case Overpass API hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const query = this.buildQuery(lat, lon, radius);
      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`OSM API error: ${response.status}`);
      }

      const data = await response.json();
      const elements: OSMElement[] = data.elements || [];
      
      // Process elements asynchronously
      const rawPoisPromises = elements.map(element => this.normalizeOSMData(element));
      const rawPoisResults = await Promise.all(rawPoisPromises);
      const rawPois = rawPoisResults.filter((poi): poi is OSMPoiData => poi !== null).slice(0, 20); // Limit to 20 results

      // Validate the parsed POI data
      return OSMPoiDataSchema.array().parse(rawPois);
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        console.warn('OSM fetch timed out after 5 seconds');
      } else {
      console.warn('Failed to fetch OSM data:', error);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Find the closest matching POI to given coordinates and name
   */
  async findMatchingPOI(name: string, lat: number, lon: number): Promise<OSMPoiData | null> {
    try {
      const pois = await this.fetchPOIData(lat, lon, 100); // Wider search
      
      // Find closest match by name similarity and distance
      const matches = pois.filter(poi => 
        poi.name?.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(poi.name?.toLowerCase() || '')
      );

      if (matches.length === 0) return null;

      // Return the first match (closest by default due to query)
      return matches[0];
    } catch (error) {
      console.warn('Failed to find matching POI:', error);
      return null;
    }
  }
}

export const osmService = new OSMService(); 