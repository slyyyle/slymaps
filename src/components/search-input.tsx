"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Coordinates } from '@/types';

interface SearchInputProps {
  accessToken?: string;
  placeholder?: string;
  value?: string;
  onResult: (coords: Coordinates, name: string, full_address: string) => void;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  autoComplete?: string;
  disabled?: boolean;
}

interface SearchSuggestion {
  mapbox_id: string;
  name: string;
  place_formatted: string;
  feature_type: string;
  address?: string;
  full_address?: string;
}

interface SearchResult {
  coordinates: Coordinates;
  name: string;
  full_address: string;
  feature_type: string;
}

export function SearchInput({ 
  accessToken, 
  placeholder = "Enter address...", 
  value: externalValue,
  onResult, 
  onValueChange,
  onClear,
  className = "",
  autoComplete = "off",
  disabled = false
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID()); // Generate once per component
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external value if provided, otherwise use internal state
  const currentValue = externalValue !== undefined ? externalValue : internalValue;
  const setValue = externalValue !== undefined ? 
    (val: string) => onValueChange?.(val) : 
    setInternalValue;

  // Step 1: Get suggestions using /suggest endpoint
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3 || !accessToken) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
      url.searchParams.set('q', query);
      url.searchParams.set('access_token', accessToken);
      url.searchParams.set('session_token', sessionToken);
      url.searchParams.set('language', 'en');
      url.searchParams.set('limit', '6');
      url.searchParams.set('proximity', '-122.3,47.6'); // Seattle area bias
      url.searchParams.set('country', 'US');
      url.searchParams.set('types', 'place,postcode,address,poi');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setShowDropdown(data.suggestions.length > 0);
        console.log('🔍 Found suggestions:', data.suggestions.length);
      }
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sessionToken]);

  // Step 2: Retrieve full details using /retrieve endpoint
  const retrieveResult = useCallback(async (mapbox_id: string, suggestionName: string) => {
    if (!accessToken) return null;
    
    setIsLoading(true);
    try {
      const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${mapbox_id}`);
      url.searchParams.set('access_token', accessToken);
      url.searchParams.set('session_token', sessionToken);
      url.searchParams.set('language', 'en');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Retrieve API error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const result: SearchResult = {
          coordinates: {
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
          },
          name: feature.properties.name || suggestionName,
          full_address: feature.properties.full_address || feature.properties.place_formatted || suggestionName,
          feature_type: feature.properties.feature_type
        };
        
        console.log('🎯 Retrieved full result:', result);
        return result;
      }
    } catch (error) {
      console.error('Search retrieve error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
    
    return null;
  }, [accessToken, sessionToken]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    
    if (!newValue) {
      setSuggestions([]);
      setShowDropdown(false);
      onClear?.();
      return;
    }
    
    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      getSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    console.log('🎯 Suggestion clicked:', suggestion);
    
    try {
      const result = await retrieveResult(suggestion.mapbox_id, suggestion.name);
      
      if (result) {
        onResult(result.coordinates, result.name, result.full_address);
        setValue(result.full_address);
        setShowDropdown(false);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Failed to retrieve result:', error);
      // Fallback: just close dropdown and show original suggestion name
      setValue(suggestion.name);
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestions.length > 0) {
        await handleSuggestionClick(suggestions[0]);
      }
    }
  };

  const handleClear = () => {
    setValue('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!accessToken) {
    return (
      <Input
        placeholder="Search disabled: Mapbox token missing"
        disabled={true}
        className={`${className} text-destructive`}
      />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full ${currentValue ? 'pr-10' : ''} ${className}`}
          aria-label={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        {currentValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <Icons.Close className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
              <Icons.Search className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </div>
          )}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.mapbox_id}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 min-w-0 overflow-hidden"
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
            >
              <div className="font-medium text-sm leading-tight break-words">{suggestion.name}</div>
              <div className="text-xs text-gray-500 mt-1 leading-tight break-words">{suggestion.place_formatted}</div>
              {suggestion.address && (
                <div className="text-xs text-gray-400 leading-tight break-words">{suggestion.address}</div>
              )}
            </button>
          ))}
          {!isLoading && suggestions.length === 0 && currentValue.length >= 3 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 