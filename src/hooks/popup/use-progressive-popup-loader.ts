import { useCallback, useEffect } from 'react';
import { usePopupStore } from '@/stores/use-popup-store';
import { findNearbyTransit, getStopSchedule } from '@/services/oba';
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
import type { ObaArrivalDeparture } from '@/types/oba';

// In-memory cache for transit arrivals by stop ID
const arrivalsCache: Map<string, ObaArrivalDeparture[]> = new Map();

// Connection-aware loading strategy
const getConnectionQuality = (): 'fast' | 'slow' | 'minimal' => {
  if (typeof navigator === 'undefined') return 'fast';
  
  const nav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } };
  const connection = nav.connection;
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
    // Always use static GTFS schedule for OBA stops
    if (poi.isObaStop) {
      const props = poi.properties as Record<string, any> | undefined;
      const stop = {
        id: poi.id,
        name: poi.name,
        code: props?.stop_code as string,
        direction: props?.direction as string | undefined,
        latitude: poi.latitude,
        longitude: poi.longitude,
        routeIds: (props?.route_ids as string[]) || [],
        distance: 0,
      };
      // Placeholder for schedule references
      let references: { agencies?: import('@/types/oba').ObaAgency[]; routes?: import('@/types/oba').ObaRoute[] } | undefined;
      console.log(`📅 Fetching static schedule for stop: ${poi.id}`);
      // NEW: Check in-memory cache for existing arrivals
      if (arrivalsCache.has(poi.id)) {
        const cachedArrivals = arrivalsCache.get(poi.id)!;
        console.log(`🗄️ Using cached arrivals for stop: ${poi.id}`, cachedArrivals);
        return {
          stops: [stop],
          routes: [],
          stopArrivals: [{ stop, arrivals: cachedArrivals }],
          searchLocation: { latitude: poi.latitude, longitude: poi.longitude, radius: 0 },
          agencies: references?.agencies,
          referenceRoutes: references?.routes
        } as TransitSectionData;
      }
      // Fetch schedule result and references
      const scheduleResult = await getStopSchedule(poi.id);
      const schedule = scheduleResult.entry;
      references = scheduleResult.references;
      try {
        const now = Date.now();
        const rawRouteSchedules = Array.isArray(schedule.stopRouteSchedules)
          ? schedule.stopRouteSchedules
          : [];
        if (rawRouteSchedules.length === 0) {
          console.warn(`No stopRouteSchedules in schedule for stop ${poi.id}:`, schedule);
        }
        const allArrivals = rawRouteSchedules.flatMap(routeSched => {
          // Each route schedule can have multiple direction schedules
          const directionArray = Array.isArray(routeSched.stopRouteDirectionSchedules)
            ? routeSched.stopRouteDirectionSchedules
            : [];
          if (directionArray.length === 0) {
            console.warn(`No stopRouteDirectionSchedules for route ${routeSched.routeId} at stop ${poi.id}`);
          }
          return directionArray.flatMap(dirSched => {
            const rawTimes = Array.isArray(dirSched.scheduleStopTimes)
              ? dirSched.scheduleStopTimes
              : [];
            if (rawTimes.length === 0) {
              console.warn(`No scheduleStopTimes in direction sched for route ${routeSched.routeId} at stop ${poi.id}`);
            }
            return rawTimes.map(st => ({
              routeId: routeSched.routeId,
              routeShortName: routeSched.routeId.split('_')[1] || routeSched.routeId,
              tripId: st.tripId,
              tripHeadsign: '',
              stopId: poi.id,
              scheduledArrivalTime: st.arrivalTime,
              predictedArrivalTime: null,
              status: 'scheduled',
              vehicleId: undefined,
              distanceFromStop: undefined,
              lastUpdateTime: undefined
            }));
          });
        });
        // Show all arrivals within the next 3 hours
        const horizonTime = now + 3 * 60 * 60 * 1000;
        const upcoming = allArrivals
          .filter(a => {
            const useTime = a.predictedArrivalTime || a.scheduledArrivalTime;
            return useTime >= now && useTime <= horizonTime;
          })
          .sort((a, b) => {
            const timeA = a.predictedArrivalTime || a.scheduledArrivalTime;
            const timeB = b.predictedArrivalTime || b.scheduledArrivalTime;
            return timeA - timeB;
          });
        // NEW: Cache the computed arrivals
        arrivalsCache.set(poi.id, upcoming);
      return {
          stops: [stop],
          routes: [],
          stopArrivals: [{ stop, arrivals: upcoming }],
          searchLocation: { latitude: poi.latitude, longitude: poi.longitude, radius: 0 },
          agencies: references?.agencies,
          referenceRoutes: references?.routes
        } as TransitSectionData;
    } catch (error) {
        console.error(`Schedule loading failed for ${poi.id}:`, error);
        return {
          stops: [{ ...stop, routeIds: [] }],
          routes: [],
          stopArrivals: [{ stop, arrivals: [] }],
          searchLocation: { latitude: poi.latitude, longitude: poi.longitude, radius: 0 },
          agencies: references?.agencies,
          referenceRoutes: references?.routes
        } as TransitSectionData;
      }
    }
    // For non-OBA POIs, no transit data
    return null;
  }, [poi]);

  const loadHoursSection = useCallback(async () => {
    if (!poi) return null;
    
    console.log(` Loading hours data for POI: ${poi.name}`);
    
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
    
    // Layer 1: Transit (highest priority - immediate) - only for specific OBA stop POIs
    if (poi.isObaStop) {
    loadSection('transit', loadTransitSection);
    }
    
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
    // When POI changes, clear and start loading once
    setCurrentPOI(poi);
    if (poi) {
      startProgressiveLoad();
    }
  }, [poi?.id]);

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