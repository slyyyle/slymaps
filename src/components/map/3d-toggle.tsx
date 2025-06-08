"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { log } from '@/lib/logging';

interface ThreeDToggleProps {
  is3DEnabled: boolean;
  onToggle3D: (enabled: boolean) => void;
  isStandardStyle: boolean;
}

export function ThreeDToggle({
  is3DEnabled,
  onToggle3D,
  isStandardStyle
}: ThreeDToggleProps) {
  if (!isStandardStyle) {
    return null;
  }

  const handleToggle = () => {
    log.control(`Toggling 3D: ${!is3DEnabled}`);
    onToggle3D(!is3DEnabled);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <Button
        onClick={handleToggle}
        className={`
          w-10 h-10 p-0 rounded-none border-0 shadow-none cursor-pointer
          ${is3DEnabled ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}
        `}
        title={`${is3DEnabled ? 'Disable' : 'Enable'} 3D objects`}
        type="button"
      >
        <span className="text-xs font-semibold">3D</span>
      </Button>
    </div>
  );
} 