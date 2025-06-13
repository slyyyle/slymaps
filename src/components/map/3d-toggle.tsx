"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { log } from '@/lib/logging';

interface ThreeDToggleProps {
  is3DEnabled: boolean;
  onToggle3D: (enabled: boolean) => void;
  isStandardStyle: boolean;
}

const viewOptions = [
  { value: false, label: '2D' },
  { value: true, label: '3D' },
];

export function ThreeDToggle({
  is3DEnabled,
  onToggle3D,
  isStandardStyle
}: ThreeDToggleProps) {
  if (!isStandardStyle) {
    return null;
  }

  const handleOptionClick = (enabled: boolean) => {
    log.control(`Setting view mode: ${enabled ? '3D' : '2D'}`);
    onToggle3D(enabled);
  };

  return (
    <div className="quick-settings-container rounded-lg shadow-lg overflow-hidden flex flex-row">
      {viewOptions.map((option, index) => {
        const isSelected = is3DEnabled === option.value;
        
        return (
          <Button
            key={option.label}
            onClick={() => handleOptionClick(option.value)}
            className={`
              w-10 h-10 p-0 rounded-none border-0 shadow-none cursor-pointer transition-all duration-200
              ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent quick-settings-text hover:bg-gray-50'}
              ${index < viewOptions.length - 1 ? 'border-r border-gray-200' : ''}
            `}
            title={`${option.label} view mode`}
            type="button"
          >
            <span className="text-xs font-semibold">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
} 