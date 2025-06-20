"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useSearchHistory } from '@/hooks/search/use-search-history';
import { useUnifiedSearch } from '@/hooks/search/use-unified-search';
import { useSearchResultHandling } from '../../hooks/search/use-search-result-handling';
import { useSearchActions } from '@/hooks/search/use-search-actions';
import { MapboxSearchBox } from '@/components/search/mapbox-searchbox';
import { SearchActions } from '@/components/search/search-actions';
import { UnifiedSuggestionsDropdown } from '@/components/search/unified-suggestions-dropdown';
import type { Coordinates, Place } from '@/types/core';
import type { MapboxRetrieveFeature, MapboxSuggestion, MapboxRetrieveResponse } from '@/types/mapbox';
import type { ObaStopSearchResult, UnifiedSearchSuggestion } from '@/types/transit/oba';
import type { MapRef } from 'react-map-gl/mapbox';
import { convertMapboxSuggestionsToUnified } from '@/utils/search-utils';

interface UnifiedSearchBoxProps {
  accessToken: string;
  onResult?: (coords: Coordinates, name?: string) => void;
  onClear: () => void;
  onRouteSelect?: (routeId: string) => void;
  onStopSelect?: (stop: ObaStopSearchResult) => void;
  onLocationSelect?: (poi: Place) => void;
  onTransitNearby?: (coords: Coordinates) => void;
  currentLocation?: Coordinates;
  // Types of suggestions to show: 'place','stop','route'
  suggestionTypes?: Array<'place' | 'stop' | 'route'>;
  
  // Map integration props
  mapRef?: React.RefObject<MapRef>;
  
  // Configuration options
  placeholder?: string;
  showNearbyTransit?: boolean;
  className?: string;
  
  // Search-input specific props for backwards compatibility
  value?: string;
  onValueChange?: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}

export function UnifiedSearchBox({
  accessToken,
  onResult,
  onClear,
  onRouteSelect,
  onStopSelect,
  onLocationSelect,
  onTransitNearby,
  currentLocation,
  mapRef,
  placeholder = "Search places, addresses, or transit (routes/stops)...",
  showNearbyTransit = true,
  className = "",
  value: externalValue,
  onValueChange,
  disabled: _disabled = false,
  suggestionTypes = ['place','stop','route'],
}: UnifiedSearchBoxProps) {
  const { addSearchHistory } = useSearchHistory();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [mapboxSuggestions, setMapboxSuggestions] = useState<MapboxSuggestion[]>([]);
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Use custom hooks for business logic
  const unifiedSearch = useUnifiedSearch({
    currentLocation,
  });

  const searchResultHandling = useSearchResultHandling({
    onResult,
    onRouteSelect,
    onStopSelect,
    onLocationSelect,
    onValueChange,
  });

  const searchActions = useSearchActions({
    currentLocation,
    onTransitNearby,
    onClear,
    onValueChange,
    searchBoxRef,
  });

  // Handle input change for search
  const handleInputChange = useCallback((value: string) => {
    setCurrentQuery(value);
    onValueChange?.(value);
    
    if (value.trim()) {
      unifiedSearch.searchOBA(value);
    } else {
      unifiedSearch.clearSearchResults();
      onClear();
    }
  }, [onValueChange, unifiedSearch, onClear]);

  // Merge Mapbox and unified suggestions
  const allSuggestions = React.useMemo(() => {
    const unifiedMapboxSuggestions = convertMapboxSuggestionsToUnified(mapboxSuggestions);
    return [...unifiedSearch.unifiedSuggestions, ...unifiedMapboxSuggestions];
  }, [unifiedSearch.unifiedSuggestions, mapboxSuggestions]);

  // Filter by allowed types
  const filteredSuggestions = React.useMemo(() => 
    allSuggestions.filter(s => suggestionTypes.includes(s.type as 'place'|'stop'|'route'))
  , [allSuggestions, suggestionTypes]);

  // Handle search box retrieve with cleanup - Updated for 2025 API
  const handleSearchBoxRetrieve = useCallback((result: MapboxRetrieveFeature) => {
    // Record this place search in history
    const coords = {
      latitude: result.geometry.coordinates[1],
      longitude: result.geometry.coordinates[0],
    };
    addSearchHistory({ query: currentQuery, metadata: { mapboxFeatures: [], pois: [], routes: [], coords } });

    // Delegate to existing retrieve handler to add POI, select, and fly
    searchResultHandling.handleSearchBoxRetrieve(result);
    unifiedSearch.clearSearchResults();
    // Set the input box to the full address/name and keep it for clearing
    const displayName = result.properties.full_address || result.properties.place_formatted || result.properties.name;
    (searchBoxRef.current as any)?.setValue(displayName);
    setCurrentQuery(displayName);
    onValueChange?.(displayName);
  }, [searchResultHandling, unifiedSearch, addSearchHistory, currentQuery, onValueChange]);

  // Handle Mapbox suggestions from the search box
  const handleMapboxSuggestionsChange = useCallback((suggestions: MapboxSuggestion[]) => {
    setMapboxSuggestions(suggestions);
  }, []);

  // Handle clear (X) click: clear all suggestion sources and reset
  const handleClearAll = useCallback(() => {
    // Clear Mapbox suggestions
    setMapboxSuggestions([]);
    // Clear unified (OBA/transit) suggestions
    unifiedSearch.clearSearchResults();
    // Reset current query state
    setCurrentQuery('');
    // Attempt to call clear if provided by MapboxSearchBox; cast to any to suppress TS error
    (searchBoxRef.current as any)?.clear?.();
    // Clear external value if controlled
    onValueChange?.('');
    // Trigger parent clear logic
    onClear();
  }, [onClear, onValueChange, unifiedSearch]);

  // Handle unified suggestion selection
  const handleUnifiedSelect = useCallback(async (suggestion: UnifiedSearchSuggestion) => {
    console.log('UnifiedSearchBox: suggestion clicked:', suggestion);
    if (suggestion.type === 'place') {
      try {
        // Retrieve full place details and add as a POI
        const params = new URLSearchParams({
          session_token: sessionToken,
          access_token: accessToken,
        });
        const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.id)}?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Retrieve failed: ${response.status}`);
        const data: MapboxRetrieveResponse = await response.json();
        const feature = data.features?.[0];
        if (feature) {
          handleSearchBoxRetrieve(feature);
        }
      } catch (error) {
        console.error('Error retrieving place details:', error);
      }
    } else if (suggestion.type === 'route') {
      // Handle route selection via search result handler (adds route POI)
      searchResultHandling.handleUnifiedSelect(suggestion);
      // Update input display and record in search history
      const displayText = suggestion.title;
      (searchBoxRef.current as any)?.setValue(displayText);
      setCurrentQuery(displayText);
      onValueChange?.(displayText);
      addSearchHistory({ query: currentQuery, metadata: { mapboxFeatures: [], pois: [], routes: [] } });
    } else if (suggestion.type === 'stop') {
      // Stop selection: invoke stop handler, update input, and record
      searchResultHandling.handleUnifiedSelect(suggestion);
        const stopData = suggestion.data as ObaStopSearchResult;
      const displayText = stopData.name;
      (searchBoxRef.current as any)?.setValue(displayText);
      setCurrentQuery(displayText);
      onValueChange?.(displayText);
        addSearchHistory({ query: currentQuery, metadata: { mapboxFeatures: [], pois: [], routes: [], coords: { latitude: stopData.latitude, longitude: stopData.longitude } } });
    }

    // Clear suggestions
    setMapboxSuggestions([]);
    unifiedSearch.clearSearchResults();
  }, [accessToken, handleSearchBoxRetrieve, searchResultHandling, sessionToken, unifiedSearch, onValueChange, addSearchHistory, currentQuery, onRouteSelect]);

  if (!accessToken) {
    return (
      <div className={`${className} p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20`}>
        Search disabled: Mapbox token missing
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Modern Mapbox SearchBox */}
      <div className="relative">
        <MapboxSearchBox
          accessToken={accessToken}
          value={externalValue}
          onChange={handleInputChange}
          onRetrieve={handleSearchBoxRetrieve}
          onSuggestionsChange={handleMapboxSuggestionsChange}
          placeholder={placeholder}
          currentLocation={currentLocation}
          mapRef={mapRef}
          ref={searchBoxRef}
          showDropdown={false} // Disable the separate Mapbox dropdown
        />
        
        {/* Action buttons */}
        <SearchActions
          showNearbyTransit={showNearbyTransit}
          currentLocation={currentLocation}
          currentQuery={currentQuery}
          externalValue={externalValue}
          onNearbyTransit={searchActions.handleNearbyTransit}
          onClear={handleClearAll}
        />
      </div>
      
      {/* Unified suggestions dropdown */}
      <UnifiedSuggestionsDropdown
        show={unifiedSearch.showSuggestionsDropdown || filteredSuggestions.length > 0}
        isLoading={unifiedSearch.isLoadingUnified}
        suggestions={filteredSuggestions}
        onSelect={handleUnifiedSelect}
      />
    </div>
  );
} 