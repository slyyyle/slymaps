"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LightingControl } from './lighting-control';
import { ThreeDToggle } from './3d-toggle';
import { ThemeToggle } from './theme-toggle';
import { BrightnessControl } from './brightness-control';
import { log } from '@/lib/logging';

interface QuickSettingsProps {
  // Lighting Control props
  currentLightPreset: 'day' | 'dusk' | 'dawn' | 'night';
  isAutoLighting: boolean;
  onChangeLightPreset: (preset: 'day' | 'dusk' | 'dawn' | 'night') => void;
  onToggleAutoLighting: (auto: boolean) => void;
  
  // 3D Toggle props
  is3DEnabled: boolean;
  onToggle3D: (enabled: boolean) => void;
  
  // Theme Toggle props
  isFadedTheme: boolean;
  onToggleTheme: (useFaded: boolean) => void;
  
  // Brightness Control props
  brightness: number;
  contrast: number;
  onBrightnessChange: (brightness: number) => void;
  onContrastChange: (contrast: number) => void;
  onReset: () => void;
  
  // Common props
  isStandardStyle: boolean;
}

export function QuickSettings({
  currentLightPreset,
  isAutoLighting,
  onChangeLightPreset,
  onToggleAutoLighting,
  is3DEnabled,
  onToggle3D,
  isFadedTheme,
  onToggleTheme,
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
  onReset,
  isStandardStyle
}: QuickSettingsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isStandardStyle) {
    return null;
  }

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    log.control(`Quick Settings ${newState ? 'expanded' : 'collapsed'}`);
  };

  const handleClose = () => {
    setIsExpanded(false);
    log.control('Quick Settings closed');
  };

  return (
    <div className="absolute bottom-8 right-4 z-50">
      {/* Settings Cog Button */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <Button
          onClick={handleToggle}
          className={`
            w-12 h-12 p-0 rounded-none border-0 shadow-none cursor-pointer
            ${isExpanded ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}
          `}
          title="Map Controls"
          type="button"
        >
          <span className="text-lg">⚙️</span>
        </Button>
      </div>

      {/* Expanded Settings Panel */}
      {isExpanded && (
        <div className="absolute bottom-14 right-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-80">
          {/* Header with Close Button */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Map Controls</span>
              <Button
                onClick={handleClose}
                className="w-6 h-6 p-0 text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded"
                variant="ghost"
                size="sm"
                title="Close controls"
              >
                <span className="text-xs">✕</span>
              </Button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="p-4 space-y-4">
            {/* Lighting Control */}
            <div>
              <span className="text-xs font-medium text-gray-600 mb-2 block">LIGHTING</span>
              <LightingControl
                currentLightPreset={currentLightPreset}
                isAutoLighting={isAutoLighting}
                onChangeLightPreset={onChangeLightPreset}
                onToggleAutoLighting={onToggleAutoLighting}
                isStandardStyle={isStandardStyle}
              />
            </div>

            {/* 3D and Theme Controls */}
            <div>
              <span className="text-xs font-medium text-gray-600 mb-2 block">VIEW</span>
              <div className="flex gap-2">
                <ThreeDToggle 
                  is3DEnabled={is3DEnabled}
                  onToggle3D={onToggle3D}
                  isStandardStyle={isStandardStyle}
                />
                <ThemeToggle 
                  isFadedTheme={isFadedTheme}
                  onToggleTheme={onToggleTheme}
                  isStandardStyle={isStandardStyle}
                />
              </div>
            </div>

            {/* Brightness Control */}
            <div>
              <BrightnessControl
                brightness={brightness}
                contrast={contrast}
                onBrightnessChange={onBrightnessChange}
                onContrastChange={onContrastChange}
                onReset={onReset}
              />
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close panel when clicking outside */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleClose}
        />
      )}
    </div>
  );
} 