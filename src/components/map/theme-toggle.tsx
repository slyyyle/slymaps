"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { log } from '@/lib/logging';

interface ThemeToggleProps {
  isFadedTheme: boolean;
  onToggleTheme: (useFaded: boolean) => void;
  isStandardStyle: boolean;
}

export function ThemeToggle({
  isFadedTheme,
  onToggleTheme,
  isStandardStyle
}: ThemeToggleProps) {
  if (!isStandardStyle) {
    return null;
  }

  const handleToggle = () => {
    log.control(`Toggling theme: ${!isFadedTheme ? 'faded' : 'default'} (${!isFadedTheme ? 'FADED' : 'NORMAL'})`);
    onToggleTheme(!isFadedTheme);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <Button
        onClick={handleToggle}
        className={`
          w-20 h-10 p-0 rounded-none border-0 shadow-none cursor-pointer text-xs font-semibold
          ${isFadedTheme ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}
        `}
        title={`${isFadedTheme ? 'Faded' : 'Normal'} theme (Click to toggle)`}
        type="button"
      >
        {isFadedTheme ? 'FADED' : 'NORMAL'}
      </Button>
    </div>
  );
} 