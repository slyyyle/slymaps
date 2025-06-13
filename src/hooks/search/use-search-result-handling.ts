import { useCallback } from 'react';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { SEARCH_CONFIG } from '@/constants/search-config';
import { determineOptimalZoom } from '@/utils/search-utils';
import type { Coordinates } from '@/types/core';
import type { MapboxRetrieveFeature } from '@/types/mapbox';
import type { UnifiedSearchSuggestion, ObaStopSearchResult } from '@/types/oba';

interface UseSearchResultHandlingOptions {
  onResult?: (coords: Coordinates, name?: string) => void;
  onRouteSelect?: (routeId: string) => void;
  onStopSelect?: (stop: ObaStopSearchResult) => void;
  onValueChange?: (value: string) => void;
}

export function useSearchResultHandling(options: UseSearchResultHandlingOptions) {
  const { onResult, onRouteSelect, onStopSelect, onValueChange } = options;
  const dataIntegration = useDataIntegration();
  const { flyTo } = useMapViewport();

  // Handle SearchBox result selection (onRetrieve callback) - 2025 Mapbox Search Box API
  const handleSearchBoxRetrieve = useCallback(async (result: MapboxRetrieveFeature) => {
    console.log('🔍 SearchBox retrieve result (2025 API):', result);
    
    if (!result || !result.properties || !result.geometry) {
      console.error('Invalid search result structure:', result);
      return;
    }

    const coords: Coordinates = {
      longitude: result.geometry.coordinates[0],
      latitude: result.geometry.coordinates[1],
    };
    
    const placeName = result.properties.full_address || result.properties.name;
    
    // Keep only the most recent 5 search result POIs
    const currentPOIs = dataIntegration.pois.getAllPOIs();
    const previousSearchResults = currentPOIs.filter(poi => poi.isSearchResult);
    // Sort ascending by retrieval time
    const sortedResults = previousSearchResults.sort((a, b) => {
      const aTime = (a as any).searchResultData?.retrievedAt ? new Date((a as any).searchResultData.retrievedAt).getTime() : 0;
      const bTime = (b as any).searchResultData?.retrievedAt ? new Date((b as any).searchResultData.retrievedAt).getTime() : 0;
      return aTime - bTime;
    });
    const maxResults = 5;
    if (sortedResults.length >= maxResults) {
      // Remove oldest so that after adding the new one we have at most maxResults
      const numToRemove = sortedResults.length - (maxResults - 1);
      sortedResults.slice(0, numToRemove).forEach(poi => {
        console.log(`🗑️ Removing old search result: ${poi.name}`);
        dataIntegration.pois.deletePOI(poi.id);
      });
    }
    
    // Create POI from the 2025 search result
    const searchResultPoi = {
      id: `search-result-${result.properties.mapbox_id || Date.now()}`,
      name: result.properties.name,
      type: result.properties.feature_type === 'poi' ? 'Point of Interest' : 
            result.properties.feature_type === 'address' ? 'Address' : 
            'Search Result',
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: result.properties.full_address || result.properties.place_formatted || result.properties.name,
      isSearchResult: true,
      searchResultData: {
        mapboxId: result.properties.mapbox_id,
        featureType: result.properties.feature_type,
        fullAddress: result.properties.full_address,
        placeFormatted: result.properties.place_formatted,
        address: result.properties.address,
        context: result.properties.context,
        coordinates: result.properties.coordinates,
        accuracy: result.properties.coordinates?.accuracy,
        maki: result.properties.maki,
        poiCategory: result.properties.poi_category,
        brand: result.properties.brand,
        externalIds: result.properties.external_ids,
        metadata: result.properties.metadata,
        retrievedAt: new Date().toISOString(),
        feature: result // Keep original feature for reference
      }
    };
    
    console.log('📍 Adding 2025 search result POI:', searchResultPoi.name);
    
    // Add the POI to the store
    const poiId = dataIntegration.pois.addPOI(searchResultPoi);
    console.log('✅ 2025 search result POI added with ID:', poiId);
    
    // Select the POI in the store
    dataIntegration.pois.selectPOI(poiId);
    
    // Determine optimal zoom level based on feature type and accuracy
    let zoomLevel: number = SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS; // Default
    
    switch (result.properties.feature_type) {
      case 'country':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.COUNTRY;
        break;
      case 'region':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.REGION;
        break;
      case 'place':
      case 'locality':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.CITY;
        break;
      case 'neighborhood':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.NEIGHBORHOOD;
        break;
      case 'address':
        zoomLevel = result.properties.coordinates?.accuracy === 'rooftop' ? 
                   SEARCH_CONFIG.ZOOM_LEVELS.PRECISE : 
                   SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS;
        break;
      case 'poi':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.POI;
        break;
      default:
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS;
    }
    
    // Fly to the location with smooth animation
    console.log(`🎯 Flying to search result location with zoom: ${zoomLevel} (feature_type: ${result.properties.feature_type})`);
    flyTo(coords, { 
      zoom: zoomLevel, 
      duration: SEARCH_CONFIG.PERFORMANCE.FLY_TO_DURATION_MS 
    });
    
    // Call onResult callback if provided, passing the feature name for header display
    if (onResult) {
      onResult(coords, result.properties.name);
    }
    
    // Clear the search input
    if (onValueChange) {
      onValueChange('');
    }
  }, [dataIntegration, onResult, flyTo, onValueChange]);

  // Handle unified suggestion selection (both transit and places)
  const handleUnifiedSelect = useCallback((suggestion: UnifiedSearchSuggestion) => {
    if (suggestion.type === 'route' && onRouteSelect) {
      const routeData = suggestion.data as unknown as import('@/types/oba').ObaRouteSearchResult;
      dataIntegration.routes.addRoute(routeData);
      onRouteSelect(suggestion.id);
    } else if (suggestion.type === 'stop' && onStopSelect) {
      const stopData = suggestion.data as ObaStopSearchResult;
      
      // Add stop to Zustand store as POI
      const poi = {
        id: stopData.id,
        name: stopData.name,
        type: 'Bus Stop',
        latitude: stopData.latitude,
        longitude: stopData.longitude,
        isObaStop: true,
        code: stopData.code,
        direction: stopData.direction,
        routeIds: stopData.routeIds,
      };
      dataIntegration.pois.addPOI(poi);
      dataIntegration.pois.selectPOI(poi.id);
      
      onStopSelect(stopData);
      
      // Also fly to the stop location
      if (onResult) {
        onResult({
          longitude: stopData.longitude,
          latitude: stopData.latitude,
        }, stopData.name);
      }
    }
  }, [onRouteSelect, onStopSelect, onResult, dataIntegration]);

  return {
    handleSearchBoxRetrieve,
    handleUnifiedSelect,
  };
} 