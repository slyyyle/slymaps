"use client";

import React, { useState, useRef, useEffect, forwardRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { useDebounce } from 'use-debounce';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandItem, CommandList, CommandEmpty, CommandLoading } from '@/components/ui/command';
import { SEARCH_CONFIG } from '@/constants/search-config';
import type { Coordinates } from '@/types/core';
import type { MapboxSuggestion, MapboxSuggestResponse, MapboxRetrieveResponse, MapboxRetrieveFeature } from '@/types/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';

interface SearchBoxProps {
  accessToken: string;
  value?: string;
  onChange: (value: string) => void;
  onRetrieve: (result: MapboxRetrieveFeature) => void;
  onSuggestionsChange?: (suggestions: MapboxSuggestion[]) => void;
  placeholder: string;
  currentLocation?: Coordinates;
  mapRef?: React.RefObject<MapRef>;
  showDropdown?: boolean;
}

export const MapboxSearchBox = forwardRef<any, SearchBoxProps>(function MapboxSearchBox({
  accessToken,
  value: externalValue,
  onChange,
  onRetrieve,
  onSuggestionsChange,
  placeholder,
  currentLocation,
  mapRef,
  showDropdown,
}, ref) {
  const [sessionToken] = useState(() => crypto.randomUUID());
  // Internal div ref to attach to DOM
  const divRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue] = useDebounce(inputValue, SEARCH_CONFIG.PERFORMANCE.DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | undefined>(undefined);
  const skipFetch = useRef(false);

  // Expose clear() and setValue() methods via ref
  useImperativeHandle(ref, () => ({
    clear: () => {
      setInputValue('');
      setSuggestions([]);
      setIsPopoverOpen(false);
      onChange('');
    },
    setValue: (val: string) => {
      skipFetch.current = true;
      // Programmatically set input without retriggering suggestions
      setInputValue(val);
      setIsPopoverOpen(false);
    }
  }), [onChange]);

  const mapInstance = mapRef?.current?.getMap();

  // Update bounds when map moves
  useEffect(() => {
    if (!mapInstance) return;

    const updateBounds = () => {
      try {
        const bounds = mapInstance.getBounds();
        if (bounds) {
          const newBounds: [number, number, number, number] = [
            bounds.getWest(), 
            bounds.getSouth(), 
            bounds.getEast(), 
            bounds.getNorth()
          ];
          setMapBounds(newBounds);
        }
      } catch (error) {
        console.warn('Failed to get map bounds for search bbox:', error);
        setMapBounds(undefined);
      }
    };

    // Initial bounds
    updateBounds();

    // Listen for map movements
    mapInstance.on('moveend', updateBounds);
    mapInstance.on('zoomend', updateBounds);

    return () => {
      mapInstance.off('moveend', updateBounds);
      mapInstance.off('zoomend', updateBounds);
    };
  }, [mapInstance]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: query,
        access_token: accessToken,
        session_token: sessionToken,
        language: SEARCH_CONFIG.DEFAULT_OPTIONS.language,
        country: SEARCH_CONFIG.DEFAULT_OPTIONS.country,
        limit: SEARCH_CONFIG.DEFAULT_OPTIONS.limit.toString(),
        types: SEARCH_CONFIG.SEARCH_TYPES.GENERAL,
      });

      // Add proximity if available
      if (currentLocation) {
        params.append('proximity', `${currentLocation.longitude},${currentLocation.latitude}`);
      }

      // Add bbox if available
      if (mapBounds) {
        params.append('bbox', mapBounds.join(','));
        if (SEARCH_CONFIG.ANALYTICS.DEBUG_MODE) {
          console.log('Search restricted to viewport bounds:', mapBounds);
        }
      }
      
      const endpoint = `https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`;

      if (SEARCH_CONFIG.ANALYTICS.DEBUG_MODE) {
        console.log('Mapbox Suggest API call:', endpoint);
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: MapboxSuggestResponse = await response.json();
      
      if (SEARCH_CONFIG.ANALYTICS.DEBUG_MODE) {
        console.log('Mapbox Suggest API Response:', data);
      }
      
      const newSuggestions = data.suggestions || [];
      setSuggestions(newSuggestions);
      onSuggestionsChange?.(newSuggestions);
    } catch (error) {
      console.error('Error fetching Mapbox suggestions:', error);
      setSuggestions([]);
      onSuggestionsChange?.([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sessionToken, currentLocation, mapBounds]);

  useEffect(() => {
    if (debouncedInputValue) {
      if (skipFetch.current) {
        // Skip this fetch when programmatically setting the value
        skipFetch.current = false;
        setSuggestions([]);
        onSuggestionsChange?.([]);
      } else {
        // Only fetch when the input text actually changes
        fetchSuggestions(debouncedInputValue);
      }
    } else {
      setSuggestions([]);
      onSuggestionsChange?.([]);
    }
  }, [debouncedInputValue, onSuggestionsChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    if (newValue && showDropdown !== false) {
      setIsPopoverOpen(true);
    } else {
      setIsPopoverOpen(false);
      setSuggestions([]);
    }
  };
  
  const handleSuggestionSelect = async (suggestion: MapboxSuggestion) => {
    try {
      const params = new URLSearchParams({
        session_token: sessionToken,
        access_token: accessToken,
      });

      const retrieveEndpoint = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?${params.toString()}`;
      
      const response = await fetch(retrieveEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: MapboxRetrieveResponse = await response.json();
      
      if (SEARCH_CONFIG.ANALYTICS.DEBUG_MODE) {
        console.log('Mapbox Retrieve API Response:', data);
      }
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const displayName = feature.properties.full_address || feature.properties.name;
        setInputValue(displayName);
        setIsPopoverOpen(false);
        onRetrieve(feature);
        onChange?.(displayName); 
      }
    } catch (error) {
      console.error('Error retrieving Mapbox feature:', error);
    }
  };

  const getSuggestionDisplayText = (suggestion: MapboxSuggestion) => {
    return suggestion.full_address || suggestion.name;
  };

  const getSuggestionSecondaryText = (suggestion: MapboxSuggestion) => {
    if (suggestion.full_address && suggestion.name !== suggestion.full_address) {
      return suggestion.place_formatted;
    }
    return suggestion.place_formatted;
  };

  return (
    <div ref={divRef} className="relative w-full">
      <Popover open={showDropdown !== false ? isPopoverOpen : false} onOpenChange={setIsPopoverOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
            />
            <Input
              type="text"
              value={externalValue ?? inputValue}
              onChange={handleInputChange}
              onFocus={() => { if(suggestions.length > 0 && showDropdown !== false) setIsPopoverOpen(true)}}
              placeholder={placeholder}
              className="pl-10 w-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{
                color: 'hsl(var(--sidebar-foreground))',
              }}
              autoComplete="off"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0 border shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{
            backgroundColor: 'hsl(var(--sidebar-background))',
            borderColor: 'hsl(var(--sidebar-border))',
            color: 'hsl(var(--sidebar-foreground))',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Command 
            className="bg-transparent"
            style={{
              backgroundColor: 'transparent',
              color: 'hsl(var(--sidebar-foreground))',
            }}
          >
            <CommandList>
              {isLoading && (
                <CommandLoading 
                  style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
                >
                  Fetching places...
                </CommandLoading>
              )}
              <CommandEmpty
                style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
              >
                {!isLoading && suggestions.length === 0 && 'No results found.'}
              </CommandEmpty>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.mapbox_id}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                  value={getSuggestionDisplayText(suggestion)}
                  className="flex flex-col items-start py-2 cursor-pointer"
                  style={{
                    color: 'hsl(var(--sidebar-foreground))',
                    backgroundColor: 'transparent',
                  }}
                >
                  <div className="flex items-center w-full">
                    <MapPin 
                      className="mr-2 h-4 w-4 flex-shrink-0" 
                      style={{ color: 'hsl(var(--sidebar-accent))' }}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {suggestion.name}
                      </span>
                      {getSuggestionSecondaryText(suggestion) && (
                        <span className="text-sm truncate opacity-70">
                          {getSuggestionSecondaryText(suggestion)}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}); 