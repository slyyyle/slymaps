import { useCallback, useEffect } from 'react';
import { usePopupStore } from '@/stores/use-popup-store';
import { findNearbyTransit, getArrivalsForStop } from '@/services/oba';
import { osmService } from '@/services/osm-service';
import type { 
  POI, 
  ProgressiveLoaderState, 
  TransitSectionData, 
  HoursSectionData,
  NearbySectionData,
  PhotosSectionData,
  Coordinates,
  OSMCoordinates 
} from '@/types/popup';

// Connection-aware loading strategy
const getConnectionQuality = (): 'fast' | 'slow' | 'minimal' => {
  if (typeof navigator === 'undefined') return 'fast';
  
  const connection = (navigator as any).connection;
  if (!connection) return 'fast';
  
  if (connection.saveData || connection.effectiveType === '2g') return 'minimal';
  if (connection.effectiveType === '3g') return 'slow';
  return 'fast';
};

// Coordinate system bridge function
const toOBACoordinates = (poi: POI): Coordinates => ({
  latitude: poi.latitude,
  longitude: poi.longitude
})

const toOSMCoordinates = (poi: POI): OSMCoordinates => ({
  lat: poi.latitude,
  lon: poi.longitude
})

export const useProgressivePopupLoader = (poi: POI | null) => {
  const { 
    loadSection, 
    getSectionState, 
    setCurrentPOI,
    isAnyLoading,
    clearSections
  } = usePopupStore();

  // 🔧 STABLE REFERENCES: Your proven pattern - empty deps
  const loadTransitSection = useCallback(async () => {
    if (!poi) return null;
    
    console.log(`🚌 Loading transit data for POI: ${poi.name}`);
    
    try {
      // Find nearby transit stops
      const nearbyTransit = await findNearbyTransit(
        toOBACoordinates(poi), 
        500 // 500m radius
      );
      
      // Get real-time arrivals for nearby stops (limit to first 3 stops)
      const transitStops = nearbyTransit.stops.slice(0, 3);
      const arrivalPromises = transitStops.map(async (stop) => {
        try {
          const arrivals = await getArrivalsForStop(stop.id);
          return { stop, arrivals: arrivals.slice(0, 3) }; // Max 3 arrivals per stop
        } catch (error) {
          console.warn(`Failed to get arrivals for stop ${stop.id}:`, error);
          return { stop, arrivals: [] };
        }
      });
      
      const stopArrivals = await Promise.all(arrivalPromises);
      
      return {
        stops: nearbyTransit.stops,
        routes: nearbyTransit.routes,
        stopArrivals,
        searchLocation: nearbyTransit.searchLocation
      };
    } catch (error) {
      console.error('Transit section loading failed:', error);
      throw error;
    }
  }, []); // Empty deps = stable forever

  const loadHoursSection = useCallback(async () => {
    if (!poi) return null;
    
    console.log(`🕐 Loading hours data for POI: ${poi.name}`);
    
    try {
      // 🆕 Check if POI already has OSM enrichment data (for native POIs)
      if (poi.properties?.osm_enriched && poi.properties?.osm_opening_hours) {
        console.log('✅ Using existing OSM enrichment data for hours');
        return {
          opening_hours: poi.properties.osm_opening_hours,
          phone: poi.properties.osm_phone,
          website: poi.properties.osm_website,
          operator: poi.properties.osm_operator,
          brand: poi.properties.osm_brand,
          source: 'osm-enriched'
        };
      }
      
      // Check if POI already has hours in properties (legacy)
      if (poi.properties?.opening_hours) {
        return {
          opening_hours: poi.properties.opening_hours,
          phone: poi.properties.phone,
          website: poi.properties.website,
          source: 'existing'
        };
      }
      
      // Only fetch from OSM if not already enriched
      if (!poi.properties?.osm_enriched) {
        console.log('🌍 Fetching fresh OSM data for hours section...');
        const osmMatch = await osmService.findMatchingPOI(
          poi.name, 
          toOSMCoordinates(poi).lat, 
          toOSMCoordinates(poi).lon
        );
        
        if (osmMatch?.opening_hours) {
          return {
            opening_hours: osmMatch.opening_hours,
            phone: osmMatch.phone,
            website: osmMatch.website,
            operator: osmMatch.operator,
            brand: osmMatch.brand,
            source: 'osm'
          };
        }
      }
      
      return null; // No hours data available
    } catch (error) {
      console.error('Hours section loading failed:', error);
      throw error;
    }
  }, []); // Empty deps = stable forever

  const loadNearbySection = useCallback(async () => {
    if (!poi) return null;
    
    console.log(`📍 Loading nearby POIs for: ${poi.name}`);
    
    try {
      // Get nearby OSM POIs
      const nearbyPOIs = await osmService.fetchPOIData(
        toOSMCoordinates(poi).lat, 
        toOSMCoordinates(poi).lon, 
        200 // 200m radius for nearby POIs
      );
      
      // Filter and categorize nearby POIs
      const categorized = nearbyPOIs.reduce((acc, nearbyPoi) => {
        const category = nearbyPoi.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(nearbyPoi);
        return acc;
      }, {} as Record<string, typeof nearbyPOIs>);
      
      return {
        total: nearbyPOIs.length,
        categories: categorized,
        topCategories: Object.entries(categorized)
          .sort(([,a], [,b]) => b.length - a.length)
          .slice(0, 3) // Top 3 categories
      };
    } catch (error) {
      console.error('Nearby section loading failed:', error);
      throw error;
    }
  }, []); // Empty deps = stable forever

  const loadPhotosSection = useCallback(async () => {
    if (!poi?.name) return null;
    
    console.log(`📸 Loading photos for POI: ${poi.name}`);
    
    try {
      // Mock implementation - replace with actual photo service
      // This could integrate with Wikimedia Commons, Google Places Photos, etc.
      const mockPhotos = [
        {
          url: `https://picsum.photos/300/200?random=${poi.id}`,
          caption: `Photo of ${poi.name}`,
          source: 'mock',
          attribution: 'Lorem Picsum'
        }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        photos: mockPhotos,
        total: mockPhotos.length,
        source: 'mock'
      };
    } catch (error) {
      console.error('Photos section loading failed:', error);
      throw error;
    }
  }, []); // Empty deps = stable forever

  // Progressive loading with connection awareness
  const startProgressiveLoad = useCallback(() => {
    if (!poi) return;
    
    const connectionQuality = getConnectionQuality();
    console.log(`🌐 Connection quality: ${connectionQuality}, starting progressive load`);
    
    // Layer 1: Transit (highest priority - immediate)
    loadSection('transit', loadTransitSection);
    
    if (connectionQuality === 'minimal') {
      // On slow connections, only load transit
      return;
    }
    
    // Layer 2: Hours (secondary importance - small delay)
    setTimeout(() => {
      loadSection('hours', loadHoursSection);
    }, connectionQuality === 'slow' ? 200 : 100);
    
    // Layer 3: Nearby POIs (tertiary importance)
    setTimeout(() => {
      loadSection('nearby', loadNearbySection);
    }, connectionQuality === 'slow' ? 600 : 300);
    
    if (connectionQuality === 'fast') {
      // Layer 4: Photos (nice-to-have - only on fast connections)
      setTimeout(() => {
        loadSection('photos', loadPhotosSection);
      }, 800);
    }
  }, [loadSection, loadTransitSection, loadHoursSection, loadNearbySection, loadPhotosSection]);

  // Local retry function
  const retrySection = useCallback((sectionId: string) => {
    console.log(`🔄 Retrying section: ${sectionId}`);
    
    switch (sectionId) {
      case 'transit':
        loadSection('transit', loadTransitSection);
        break;
      case 'hours':
        loadSection('hours', loadHoursSection);
        break;
      case 'nearby':
        loadSection('nearby', loadNearbySection);
        break;
      case 'photos':
        loadSection('photos', loadPhotosSection);
        break;
    }
  }, [loadSection, loadTransitSection, loadHoursSection, loadNearbySection, loadPhotosSection]);

  // Auto-start loading when POI changes
  useEffect(() => {
    setCurrentPOI(poi);
    if (poi) {
      startProgressiveLoad();
    }
  }, [poi?.id, setCurrentPOI, startProgressiveLoad]);

  return {
    // Section states
    transitSection: getSectionState<TransitSectionData>('transit'),
    hoursSection: getSectionState<HoursSectionData>('hours'),
    nearbySection: getSectionState<NearbySectionData>('nearby'),
    photosSection: getSectionState<PhotosSectionData>('photos'),
    
    // Controls
    startProgressiveLoad,
    retrySection,
  };
}; 