"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { log } from '@/lib/logging';

interface BrightnessControlProps {
  brightness: number; // Now expected to be 0-100, where 50 = no effect
  contrast: number;   // Now expected to be 0-100, where 50 = no effect
  onBrightnessChange: (brightness: number) => void;
  onContrastChange: (contrast: number) => void;
  onReset: () => void;
}

export function BrightnessControl({
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
  onReset
}: BrightnessControlProps) {
  
  const isDefault = brightness === 50 && contrast === 50;
  
  const handleBrightnessChange = (values: number[]) => {
    const newValue = values[0];
    log.control(`Brightness changed to ${newValue}%`);
    onBrightnessChange(newValue);
  };

  const handleContrastChange = (values: number[]) => {
    const newValue = values[0];
    log.control(`Contrast changed to ${newValue}%`);
    onContrastChange(newValue);
  };

  const handleReset = () => {
    log.control('Resetting brightness and contrast to defaults');
    onReset();
  };

  // Convert slider values (0-100) to CSS filter values
  // 50 = 1.0 (no effect), 0 = 0.0, 100 = 2.0
  const getBrightnessEffect = () => (brightness / 50).toFixed(1);
  const getContrastEffect = () => (contrast / 50).toFixed(1);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">FILTERS</span>
            <Button
              onClick={handleReset}
              className={`text-xs px-2 py-1 h-6 ${!isDefault ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400'}`}
              variant="ghost"
              size="sm"
              disabled={isDefault}
              title="Reset to defaults (50%)"
            >
              Reset
            </Button>
          </div>
        </div>
        
        {/* Brightness Control */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Brightness</span>
            <span className="text-xs text-gray-500">{brightness}% ({getBrightnessEffect()}x)</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={handleBrightnessChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>

        {/* Contrast Control */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Contrast</span>
            <span className="text-xs text-gray-500">{contrast}% ({getContrastEffect()}x)</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={handleContrastChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
} 