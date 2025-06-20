"use client";

import React from 'react';
import { TransitSection, ActionsSection } from '@/components/popup/popup-sections';
import type { PopupSection } from '@/types/ui/popup';
import type { Place } from '@/types/core';

interface FixedTransitPanelProps {
  poi: Place;
  onDirections: (poi: Place) => void;
  onSave: (poi: Place) => void;
  isSidebarOpen: boolean;
  popupTheme: string;
}

const FixedTransitPanel: React.FC<FixedTransitPanelProps> = ({
  poi,
  onDirections,
  onSave,
  isSidebarOpen,
  popupTheme
}) => (
  <div className={`absolute bottom-4 left-4 z-40 ${isSidebarOpen ? 'md:left-[calc(24rem+1rem)]' : ''}`}>
    <div className={`min-w-[320px] p-4 rounded-md ${popupTheme}`}> 
      <TransitSection stopId={poi.id} />
      <ActionsSection
        poi={poi}
        onDirections={onDirections}
        onSave={onSave}
      />
    </div>
  </div>
);

export default FixedTransitPanel; 