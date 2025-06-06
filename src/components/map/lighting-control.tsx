"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { log } from '@/lib/logging';

interface LightingControlProps {
  currentLightPreset: 'day' | 'dusk' | 'dawn' | 'night';
  isAutoLighting: boolean;
  onChangeLightPreset: (preset: 'day' | 'dusk' | 'dawn' | 'night') => void;
  onToggleAutoLighting: (auto: boolean) => void;
  isStandardStyle: boolean;
}

const lightingOptions = [
  { value: 'auto' as const, label: 'Auto', icon: '⚡' },
  { value: 'day' as const, label: 'Day', icon: '☀️' },
  { value: 'dusk' as const, label: 'Dusk', icon: '🌆' },
  { value: 'dawn' as const, label: 'Dawn', icon: '🌅' },
  { value: 'night' as const, label: 'Night', icon: '🌙' },
];

export function LightingControl({
  currentLightPreset,
  isAutoLighting,
  onChangeLightPreset,
  onToggleAutoLighting,
  isStandardStyle
}: LightingControlProps) {
  if (!isStandardStyle) {
    return null;
  }

  // Determine which option is currently selected
  const currentSelection = isAutoLighting ? 'auto' : currentLightPreset;

  const handleOptionClick = (option: typeof lightingOptions[0]) => {
    log.lighting3d(`Lighting control clicked: ${option.value} (current: isAuto=${isAutoLighting}, preset=${currentLightPreset})`);
    
    if (option.value === 'auto') {
      log.control('Enabling auto lighting');
      onToggleAutoLighting(true);
    } else {
      log.control(`Setting manual preset: ${option.value}`);
      onToggleAutoLighting(false);
      onChangeLightPreset(option.value as 'day' | 'dusk' | 'dawn' | 'night');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {lightingOptions.map((option, index) => {
        const isSelected = currentSelection === option.value;
        
        return (
          <Button
            key={option.value}
            onClick={() => handleOptionClick(option)}
            className={`
              w-10 h-10 p-0 rounded-none border-0 shadow-none cursor-pointer
              ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}
              ${index < lightingOptions.length - 1 ? 'border-b border-gray-200' : ''}
            `}
            title={`${option.label} lighting`}
            type="button"
          >
            <span className="text-base">{option.icon}</span>
          </Button>
        );
      })}
    </div>
  );
} 