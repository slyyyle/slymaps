/* eslint-disable react-hooks/exhaustive-deps */
// Note: Zustand store references are stable, so we intentionally omit store dependencies
// from useCallback hooks to prevent unnecessary re-renders and infinite loops

import { useCallback, useMemo } from 'react';

// Data store - app state management
import { useDataStore, dataStoreSelectors } from '@/stores/use-data-store';
import type { POIEntity, RouteEntity } from '@/stores/use-data-store';

// Services - external API integration
import { osmService } from '@/services/osm-service';
import type { GeocodingResult } from '@/services/osm-service';

// Core types - fundamental app entities
import type { PointOfInterest, Coordinates } from '@/types/core';

// Transit types - OneBusAway integration
import type { 
  ObaArrivalDeparture,
  ObaRoute,
  CurrentOBARouteDisplayData,
  ObaVehicleLocation,
  ObaRouteGeometry,
} from '@/types/oba';

// Routing types - directions and navigation
import type { Route as RouteType } from '@/types/directions';

export function useDataIntegration() {
  const store = useDataStore();
  
  // Get raw data from store (these are stable references)
  const rawPois = useDataStore((state) => state.pois);
  const activePOIId = useDataStore((state) => state.activePOI);
  const rawRoutes = useDataStore((state) => state.routes);
  const activeRouteId = useDataStore((state) => state.activeRoute);
  
  // Memoize transformed data to prevent infinite loops
  const allPois = useMemo((): (PointOfInterest & { favorites: boolean })[] => {
    return Object.values(rawPois)
      .filter((poi): poi is POIEntity => poi != null)
      .map(poi => {
        const { lastAccessed: _lastAccessed, searchHistory: _searchHistory, cachedArrivals: _cachedArrivals, arrivalsLastFetched: _arrivalsLastFetched, ...rest } = poi;
        return { ...rest, favorites: poi.favorites ?? false };
      });
  }, [rawPois]);
  
  const activePoi = useMemo((): PointOfInterest | null => {
    const activePOI = activePOIId ? rawPois[activePOIId] : null;
    if (!activePOI) return null;
    const { lastAccessed: _lastAccessed, searchHistory: _searchHistory, favorites: _favorites, cachedArrivals: _cachedArrivals, arrivalsLastFetched: _arrivalsLastFetched, ...poi } = activePOI;
    return poi;
  }, [rawPois, activePOIId]);
  
  const activeRoute = useMemo((): RouteEntity | null => {
    return activeRouteId ? rawRoutes[activeRouteId] : null;
  }, [rawRoutes, activeRouteId]);
  
  const allRoutes = useMemo((): RouteEntity[] => {
    return Object.values(rawRoutes).filter((route): route is RouteEntity => route != null);
  }, [rawRoutes]);
  
  const handlePOIOperations = {
    getActivePOI: useCallback((): PointOfInterest | null => {
      return activePoi;
    }, [activePoi]),
    getAllPOIs: useCallback((): PointOfInterest[] => {
      return allPois;
    }, [allPois]),
    addPOI: store.addPOI,
    updatePOI: store.updatePOI,
    deletePOI: store.deletePOI,
    selectPOI: store.selectPOI,
    favoritePOI: store.favoritePOI,
    setPOIs: store.setPOIs,
    clearSearchResults: useCallback(() => {
      console.log('🧹 Clearing all search result POIs (blue pins)');
      const searchResultPois = allPois.filter(poi => poi.isSearchResult);
      searchResultPois.forEach(poi => {
        console.log(`🗑️ Removing search result POI: ${poi.name}`);
        store.deletePOI(poi.id);
      });
    }, [allPois]),
    setCachedArrivals: useCallback((poiId: string, arrivals: ObaArrivalDeparture[]) => {
      store.updatePOI(poiId, {
        cachedArrivals: arrivals,
        arrivalsLastFetched: Date.now()
      });
    }, []),
    getCachedArrivals: useCallback((poiId: string): ObaArrivalDeparture[] | null => {
      const poi = store.getPOI(poiId);
      if (!poi?.cachedArrivals || !poi.arrivalsLastFetched) return null;
      const cacheAge = Date.now() - poi.arrivalsLastFetched;
      if (cacheAge > 15 * 60 * 1000) return null;
      return poi.cachedArrivals;
    }, []),
  };

  const handleRouteOperations = {
    getActiveRoute: useCallback((): RouteEntity | null => {
      return activeRoute;
    }, [activeRoute]),
    getActiveRouteDisplayData: useCallback((): CurrentOBARouteDisplayData | null => {
      return activeRoute?.displayData ?? null;
    }, [activeRoute]),
    getAllRoutes: useCallback((): RouteEntity[] => {
      return allRoutes;
    }, [allRoutes]),
    addRoute: store.addRoute,
    updateRoute: store.updateRoute,
    deleteRoute: store.deleteRoute,
    selectRoute: useCallback((id: string | null) => {
        store.selectRoute(id);
        if (id) {
            const route = store.getRoute(id);
            if (route?.obaRoute && route.stops) {
                const displayData: CurrentOBARouteDisplayData = {
                    routeInfo: route.obaRoute,
                    stops: route.stops,
                };
                store.updateRoute(id, { displayData });
            }
        }
    }, []),
    clearAllRoutes: store.clearAllRoutes,
    setMapboxRoute: useCallback((routeId: string, route: RouteType) => {
      store.updateRoute(routeId, { mapboxRoute: route });
    }, []),
    setObaRoute: useCallback((routeId: string, obaRoute: ObaRoute) => {
      store.updateRoute(routeId, { obaRoute });
    }, []),
    setRouteGeometry: useCallback((routeId: string, geometry: ObaRouteGeometry) => {
      store.updateRoute(routeId, { geometry });
    }, []),
    setRouteVehicles: useCallback((routeId: string, vehicles: ObaVehicleLocation[]) => {
      store.updateRoute(routeId, { vehicles });
    }, []),
    getReferencedRoutes: useCallback((): Record<string, ObaRoute> => {
      const routes = Object.values(store.routes);
      const referenced: Record<string, ObaRoute> = {};
      routes.forEach(route => {
        if (route.obaRoute) {
          referenced[route.id] = route.obaRoute;
        }
      });
      return referenced;
    }, []),
    getPOIsForRoute: store.getPOIsForRoute,
    getRoutesForPOI: store.getRoutesForPOI,
    linkMultiplePOIsToRoute: useCallback((poiIds: string[], routeId: string) => {
      poiIds.forEach(poiId => store.linkPOIToRoute(poiId, routeId));
    }, []),
    syncRouteStops: useCallback((routeId: string, stops: PointOfInterest[]) => {
      const poiIds: string[] = [];
      stops.forEach(stop => {
        const poiId = store.addPOI(stop);
        poiIds.push(poiId);
        store.linkPOIToRoute(poiId, routeId);
      });
      store.updateRoute(routeId, { 
        stops: poiIds.map(id => store.getPOI(id)).filter(Boolean) as POIEntity[]
      });
    }, []),
  };
  
  const handleNavigationOperations = {
    setMapInteractionDestination: store.setMapInteractionDestination,
    setRouteCoordinates: store.setRouteCoordinates,
    getMapInteractionDestination: useCallback(() => store.mapInteractionDestination, []),
    getRouteCoordinates: useCallback(() => ({
      start: store.routeStart,
      end: store.routeEnd
    }), []),
  };

  const handleRelationshipOperations = {
    linkPOIToRoute: store.linkPOIToRoute,
    unlinkPOIFromRoute: store.unlinkPOIFromRoute,
    getPOIsForRoute: store.getPOIsForRoute,
    getRoutesForPOI: store.getRoutesForPOI,
    linkMultiplePOIsToRoute: useCallback((poiIds: string[], routeId: string) => {
      poiIds.forEach(poiId => store.linkPOIToRoute(poiId, routeId));
    }, []),
    syncRouteStops: useCallback((routeId: string, stops: PointOfInterest[]) => {
      const poiIds: string[] = [];
      stops.forEach(stop => {
        const poiId = store.addPOI(stop);
        poiIds.push(poiId);
        store.linkPOIToRoute(poiId, routeId);
      });
      store.updateRoute(routeId, { 
        stops: poiIds.map(id => store.getPOI(id)).filter(Boolean) as POIEntity[]
      });
    }, []),
  };

  const handleSearchOperations = {
    addSearch: store.addSearch,
    getRecentSearches: store.getRecentSearches,
    clearSearchHistory: store.clearSearchHistory,
  };

  const handleLoadingOperations = {
    setLoading: store.setLoading,
    isLoading: store.isLoading,
    isAnyLoading: useCallback(() => dataStoreSelectors.isDataLoading(store), []),
    setPOILoading: useCallback((poiId: string, loading: boolean) => {
      store.setLoading('pois', poiId, loading);
    }, []),
    setRouteLoading: useCallback((routeId: string, loading: boolean) => {
      store.setLoading('routes', routeId, loading);
    }, []),
    setArrivalsLoading: useCallback((poiId: string, loading: boolean) => {
      store.setLoading('arrivals', poiId, loading);
    }, []),
    setVehiclesLoading: useCallback((routeId: string, loading: boolean) => {
      store.setLoading('vehicles', routeId, loading);
    }, []),
  };

  const handleDirectionsOperations = {
    getDirections: store.getDirections,
    setDirectionsDestination: store.setDirectionsDestination,
    clearDirections: store.clearDirections,
    toggleTurnMarkers: store.toggleTurnMarkers,
    getDirectionsState: useCallback(() => store.directions, []),
  };

  const handleConfigOperations = {
    setMapboxAccessToken: store.setMapboxAccessToken,
    getMapboxAccessToken: useCallback(() => store.config.mapboxAccessToken, []),
  };

  const handleLocationOperations = {
    getCurrentLocation: useCallback((): Coordinates | null => {
      const currentLocation = store.location.currentLocation;
      return currentLocation;
    }, []),
    setCurrentLocation: store.setCurrentLocation,
    getLocationMode: useCallback(() => store.location.locationMode, []),
    setLocationMode: store.setLocationMode,
    isLoadingLocation: useCallback(() => store.location.isLoadingLocation, []),
    setLocationLoading: store.setLocationLoading,
    getLocationError: useCallback(() => store.location.locationError, []),
    setLocationError: store.setLocationError,
    // POI Creation
    isCreatingPOI: useCallback(() => store.location.isCreatingPOI, []),
    startPOICreation: store.startPOICreation,
    cancelPOICreation: store.cancelPOICreation,
    getPOICreationHandler: useCallback(() => store.location.poiCreationHandler, []),
    setPOICreationHandler: store.setPOICreationHandler,
    createPOIAtLocation: store.createPOIAtLocation,
  };
  
  const handleDiagnostics = {
    getDataStats: store.getDataStats,
    cleanupExpiredData: store.cleanupExpiredData,
    exportData: store.exportData,
    importData: store.importData,
    resetStore: store.resetStore,
    logCurrentState: useCallback(() => {
      console.group('🗂️ Data Store State');
      console.log(store.exportData());
      console.groupEnd();
    }, []),
  };

  const handleOSMOperations = {
    /**
     * Fetch OSM POI data around coordinates and add to store
     */
    fetchAndAddOSMPOIs: useCallback(async (lat: number, lon: number, radius: number = 50) => {
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
          
          store.addPOI(poi);
        });
        
        return osmPois.length;
      } catch (error) {
        console.error('Failed to fetch OSM POIs:', error);
        return 0;
      }
    }, []),

    /**
     * Enhance existing POI with OSM data
     */
    enrichPOIWithOSM: useCallback(async (poiId: string) => {
      const poi = store.getPOI(poiId);
      if (!poi) return false;

      try {
        const osmMatch = await osmService.findMatchingPOI(poi.name, poi.latitude, poi.longitude);
        if (!osmMatch) return false;

        store.updatePOI(poiId, {
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
    }, []),

    /**
     * Geocode address using OSM Nominatim
     */
    geocodeAddress: useCallback(async (address: string): Promise<GeocodingResult[]> => {
      return await osmService.geocodeAddress(address);
    }, []),

    /**
     * Reverse geocode coordinates using OSM Nominatim
     */
    reverseGeocode: useCallback(async (lat: number, lon: number): Promise<GeocodingResult | null> => {
      return await osmService.reverseGeocode(lat, lon);
    }, []),

    /**
     * Get proper address for POI using OSM reverse geocoding
     */
    getProperAddress: useCallback(async (lat: number, lon: number): Promise<string | null> => {
      const result = await osmService.reverseGeocode(lat, lon);
      return result?.address || null;
    }, []),
  };

  // Home POI management
  const handleHomeOperations = {
    getHome: useCallback(() => {
      const homeEntity = store.homePOI;
      if (!homeEntity) return null;
      const { lastAccessed: _la, searchHistory: _sh, favorites: _fav, ...clean } = homeEntity;
      return clean;
    }, [store.homePOI]),
    setHomePOI: store.setHomePOI,
    clearHomePOI: store.clearHomePOI,
  };

  return {
    home: handleHomeOperations,
    pois: handlePOIOperations,
    routes: handleRouteOperations,
    navigation: handleNavigationOperations,
    relationships: handleRelationshipOperations,
    searches: handleSearchOperations,
    loading: handleLoadingOperations,
    directions: handleDirectionsOperations,
    config: handleConfigOperations,
    location: handleLocationOperations,
    osm: handleOSMOperations,
    diagnostics: handleDiagnostics,
  };
} 