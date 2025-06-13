"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { log } from '@/lib/logging';

interface TerrainControlProps {
  isTerrainEnabled: boolean;
  terrainExaggeration: number;
  onToggleTerrain: (enabled: boolean) => void;
  onExaggerationChange: (exaggeration: number) => void;
  isStandardStyle: boolean;
}

export function TerrainControl({
  isTerrainEnabled,
  terrainExaggeration,
  onToggleTerrain,
  onExaggerationChange,
  isStandardStyle
}: TerrainControlProps) {
  if (!isStandardStyle) {
    return null;
  }

  const handleToggle = () => {
    log.control(`Toggling terrain: ${!isTerrainEnabled ? 'enabled' : 'disabled'}`);
    onToggleTerrain(!isTerrainEnabled);
  };

  const handleExaggerationChange = (values: number[]) => {
    const newValue = values[0];
    log.control(`Terrain exaggeration changed to ${newValue}x`);
    onExaggerationChange(newValue);
  };

  return (
    <div className="space-y-3">
      {/* Toggle Row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">3D TERRAIN</span>
        <Button
          onClick={handleToggle}
          className={`w-12 h-6 p-1 rounded-full transition-colors flex items-center ${
            isTerrainEnabled
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-300 hover:bg-gray-400'
          }`}
          title={`${isTerrainEnabled ? 'Disable' : 'Enable'} 3D terrain`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow border border-gray-500 transition-all ${
              isTerrainEnabled ? 'ml-auto' : ''
            }`} 
          />
        </Button>
      </div>
      
      {/* Exaggeration Slider (only show when terrain is enabled) */}
      {isTerrainEnabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Elevation</span>
            <span className="text-xs text-gray-500">{terrainExaggeration}x</span>
          </div>
          <Slider
            value={[terrainExaggeration]}
            onValueChange={handleExaggerationChange}
            max={3.0}
            min={0.5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Subtle</span>
            <span>Dramatic</span>
          </div>
        </div>
      )}
    </div>
  );
} 