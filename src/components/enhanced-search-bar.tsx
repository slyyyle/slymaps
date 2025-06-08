"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getSearchSuggestions } from '@/services/oba';
import type { Coordinates, ObaSearchSuggestion, ObaStopSearchResult } from '@/types';

interface EnhancedSearchBarProps {
  accessToken: string;
  onResult: (coords: Coordinates, name?: string) => void;
  onClear: () => void;
  onRouteSelect?: (routeId: string) => void;
  onStopSelect?: (stop: ObaStopSearchResult) => void;
  onTransitNearby?: (coords: Coordinates) => void;
  currentLocation?: Coordinates;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
  properties: {
    category?: string;
    address?: string;
  };
}

export function EnhancedSearchBar({
  accessToken,
  onResult,
  onClear,
  onRouteSelect,
  onStopSelect,
  onTransitNearby,
  currentLocation,
}: EnhancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxResults, setMapboxResults] = useState<MapboxFeature[]>([]);
  const [transitSuggestions, setTransitSuggestions] = useState<ObaSearchSuggestion[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const searchMapbox = useCallback(async (searchQuery: string) => {
    if (!accessToken || !searchQuery.trim()) {
      setMapboxResults([]);
      return;
    }

    try {
      const proximity = currentLocation 
        ? `&proximity=${currentLocation.longitude},${currentLocation.latitude}`
        : '';

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${accessToken}&limit=5&types=place,postcode,address,poi${proximity}`
      );

      if (!response.ok) {
        throw new Error('Failed to search locations');
      }

      const data = await response.json();
      setMapboxResults(data.features || []);
    } catch (error) {
      console.error('Mapbox search error:', error);
      setMapboxResults([]);
    }
  }, [accessToken, currentLocation]);

  const searchTransit = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTransitSuggestions([]);
      return;
    }

    try {
      const suggestions = await getSearchSuggestions(searchQuery, currentLocation);
      setTransitSuggestions(suggestions);
    } catch (error) {
      console.error('Transit search error:', error);
      setTransitSuggestions([]);
    }
  }, [currentLocation]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setMapboxResults([]);
      setTransitSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Perform both searches in parallel
    await Promise.all([
      searchMapbox(searchQuery),
      searchTransit(searchQuery),
    ]);

    setIsLoading(false);
  }, [searchMapbox, searchTransit]);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  }, [performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim() !== '') {
      setIsOpen(true);
      debouncedSearch(value);
    } else {
      setIsOpen(false);
      setMapboxResults([]);
      setTransitSuggestions([]);
    }
  };

  const handleMapboxSelect = (feature: MapboxFeature) => {
    const coords: Coordinates = {
      longitude: feature.center[0],
      latitude: feature.center[1],
    };
    
    setQuery(feature.place_name);
    setIsOpen(false);
    onResult(coords, feature.place_name);
  };

  const handleTransitSelect = (suggestion: ObaSearchSuggestion) => {
    setQuery(suggestion.title);
    setIsOpen(false);

    if (suggestion.type === 'route' && onRouteSelect) {
      onRouteSelect(suggestion.id);
    } else if (suggestion.type === 'stop' && onStopSelect) {
      const stopData = suggestion.data as ObaStopSearchResult;
      onStopSelect(stopData);
      
      // Also fly to the stop location
      onResult({
        longitude: stopData.longitude,
        latitude: stopData.latitude,
      }, stopData.name);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setMapboxResults([]);
    setTransitSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
    onClear();
  };

  const handleNearbyTransit = () => {
    if (currentLocation && onTransitNearby) {
      onTransitNearby(currentLocation);
      toast({
        title: "Finding Nearby Transit",
        description: "Searching for nearby bus stops and routes...",
      });
    } else {
      toast({
        title: "Location Required",
        description: "Please enable location services to find nearby transit.",
        variant: "destructive",
      });
    }
  };

  const hasResults = mapboxResults.length > 0 || transitSuggestions.length > 0;

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search places, routes, or stops..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim() !== '' && hasResults) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            // Delay hiding to allow clicks on results
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="w-full pr-24 pl-10"
        />
        <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          {currentLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNearbyTransit}
              className="h-7 w-7 p-0"
              title="Find nearby transit"
            >
              <Icons.Navigation className="h-3 w-3" />
            </Button>
          )}
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
              title="Clear search"
            >
              <Icons.Close className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {isOpen && (query.trim() !== '' || hasResults) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="p-4 text-center">
                <Icons.Time className="h-4 w-4 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : (
              <div className="p-1">
                {transitSuggestions.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Transit
                    </div>
                    {transitSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleTransitSelect(suggestion)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                      >
                        {suggestion.type === 'route' ? (
                          <Icons.Route className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Icons.MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{suggestion.title}</span>
                            {suggestion.type === 'route' && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Route
                              </Badge>
                            )}
                            {suggestion.type === 'stop' && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Stop
                              </Badge>
                            )}
                          </div>
                          {suggestion.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {transitSuggestions.length > 0 && mapboxResults.length > 0 && (
                  <Separator className="my-1" />
                )}

                {mapboxResults.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Places
                    </div>
                    {mapboxResults.map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => handleMapboxSelect(feature)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                      >
                        <Icons.MapPin className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{feature.place_name}</span>
                            {feature.properties.category && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {feature.properties.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {!isLoading && !hasResults && query.trim() !== '' && (
                  <div className="p-4 text-center">
                    <Icons.Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                          No results found for &quot;{query}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try searching for route numbers, stop names, or addresses
                        </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
} 