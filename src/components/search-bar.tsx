"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AddressAutofill, config } from '@mapbox/search-js-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Coordinates } from '@/types';

interface SearchBarProps {
  accessToken: string;
  onResult: (coords: Coordinates, name?: string) => void;
  onClear?: () => void;
}

export function SearchBar({ accessToken, onResult, onClear }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [showClearButton, setShowClearButton] = useState(false);
  const [tokenInitializing, setTokenInitializing] = useState(true);

  useEffect(() => {
    if (accessToken) {
      config.accessToken = accessToken;
      setTokenInitializing(false);
    }
  }, [accessToken]);

  const handleRetrieve = useCallback((res: any) => {
    const feature = res.features[0];
    if (feature) {
      const coords: Coordinates = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      };
      onResult(coords, feature.properties.name);
      setValue(feature.properties.formatted_address || feature.properties.name || '');
      setShowClearButton(true);
    }
  }, [onResult]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // AddressAutofill handles selection, this is more for direct input if needed
    // For now, rely on AddressAutofill's selection mechanism
  };

  const handleClear = () => {
    setValue('');
    setShowClearButton(false);
    if (onClear) {
      onClear();
    }
  };
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (!event.target.value) {
      handleClear();
    } else {
      setShowClearButton(true);
    }
  };

  if (tokenInitializing && !accessToken) { // Only show loading if token is truly missing and not just initializing
    return <div className="p-2 text-sm text-muted-foreground">Initializing search... (Ensure Mapbox token is set)</div>;
  }
  
  if (!accessToken) {
     return <div className="p-2 text-sm text-destructive">Search disabled: Mapbox token missing.</div>;
  }


  return (
    <form onSubmit={handleSubmit} className="relative">
      <AddressAutofill accessToken={accessToken} onRetrieve={handleRetrieve} options={{ country: "US", language: "en" }}>
        <Input
          placeholder="Enter destination address..."
          value={value}
          onChange={handleChange}
          autoComplete="shipping address-line1" // Standard autocomplete type for AddressAutofill
          className="w-full pr-10 shadow-md"
          aria-label="Search destination"
        />
      </AddressAutofill>
      {showClearButton && (
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
    </form>
  );
}
