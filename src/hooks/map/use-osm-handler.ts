import { useCallback, useRef } from 'react';
import { osmService } from '@/services/osm-service';
import { usePOIStore } from '@/stores/use-poi-store';
import type { PointOfInterest } from '@/types/core';

interface OSMHandlerProps {
  enableAutoEnrichment?: boolean;
}

export function useOSMHandler({ enableAutoEnrichment = true }: OSMHandlerProps = {}) {
  const poiStore = usePOIStore();
  
  // 🔧 STABLE REFS: Prevent re-render loops
  const enableAutoEnrichmentRef = useRef(enableAutoEnrichment);
  
  // Keep refs current
  enableAutoEnrichmentRef.current = enableAutoEnrichment;

  // 🔧 STABLE HANDLERS: Empty deps, use refs internally
  const fetchAndAddOSMPOIs = useCallback(async (lat: number, lon: number, radius: number = 50) => {
    try {
      console.log(`📍 Fetching OSM POIs around ${lat}, ${lon} (radius: ${radius}m)`);
      const osmPois = await osmService.fetchPOIData(lat, lon, radius);
      
      osmPois.forEach(osmPoi => {
        const poi: PointOfInterest = {
          id: `osm-${osmPoi.coordinates.lat}-${osmPoi.coordinates.lon}`,
          name: osmPoi.name || 'Unknown POI',
          description: osmPoi.address || '',
          type: osmPoi.category || 'place',
          latitude: osmPoi.coordinates.lat,
          longitude: osmPoi.coordinates.lon,
          isSearchResult: false,
          properties: {
            source: 'osm',
            osm_amenity: osmPoi.amenity,
            osm_shop: osmPoi.shop,
            osm_tourism: osmPoi.tourism,
            osm_subclass: osmPoi.subclass,
            opening_hours: osmPoi.opening_hours,
            phone: osmPoi.phone,
            website: osmPoi.website,
            operator: osmPoi.operator,
            brand: osmPoi.brand,
            cuisine: osmPoi.cuisine,
          }
        };
        
        poiStore.addSearchResult(poi, 'osm-search');
      });

      return osmPois.length;
    } catch (error) {
      console.error('Failed to fetch OSM POIs:', error);
      return 0;
    }
  }, []);

  const enrichPOIWithOSM = useCallback(async (poiId: string) => {
    try {
      const poi = poiStore.getAllStoredPOIs().find((p: any) => p.id === poiId);
      if (!poi) return false;

      const osmMatch = await osmService.findMatchingPOI(poi.name, poi.latitude, poi.longitude);
      if (!osmMatch) return false;

      poiStore.updateStoredPOI(poiId, {
        properties: {
          ...poi.properties,
          osm_amenity: osmMatch.amenity,
          osm_shop: osmMatch.shop,
          osm_tourism: osmMatch.tourism,
          opening_hours: osmMatch.opening_hours,
          phone: osmMatch.phone,
          website: osmMatch.website,
          operator: osmMatch.operator,
          brand: osmMatch.brand,
          cuisine: osmMatch.cuisine,
          osm_enriched: true,
        }
      });

      console.log(`✨ Enhanced POI "${poi.name}" with OSM data`);
      return true;
    } catch (error) {
      console.error('Failed to enhance POI with OSM:', error);
      return false;
    }
  }, []);

  const geocodeAddress = useCallback(async (address: string) => {
    return await osmService.geocodeAddress(address);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    return await osmService.reverseGeocode(lat, lon);
  }, []);

  const getProperAddressForPOI = useCallback(async (lat: number, lon: number) => {
    const result = await osmService.reverseGeocode(lat, lon);
    return result?.address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }, []);

  // Return stable interface
  return {
    fetchAndAddOSMPOIs,
    enrichPOIWithOSM,
    geocodeAddress,
    reverseGeocode,
    getProperAddressForPOI,
  };
} 