"use client";

import React, { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import type { Coordinates } from '@/types';

interface SearchBarProps {
  accessToken?: string;
  onResult: (coords: Coordinates, name?: string) => void;
  onClear?: () => void;
}

export function SearchBar({ accessToken, onResult, onClear }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleResult = (coords: Coordinates, name: string, full_address: string) => {
    onResult(coords, full_address);
  };

  const handleClear = () => {
    setValue('');
    onClear?.();
  };

  return (
    <SearchInput
      accessToken={accessToken}
      placeholder="Enter destination address..."
      value={value}
      onValueChange={setValue}
      onResult={handleResult}
      onClear={handleClear}
      className="shadow-md"
    />
  );
}
