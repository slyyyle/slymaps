import React from 'react';
import PopupWrapper from '@/components/map/PopupWrapper';
import { useThemeStore } from '@/stores/theme-store';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Place } from '@/types/core';

interface HomePopupProps {
  homeLocation: Place & { setAt?: number };
  onClose: () => void;
  mapRef?: React.RefObject<MapRef>;
}

const HomePopup: React.FC<HomePopupProps> = ({ homeLocation, onClose, mapRef }) => {
  const { popupTheme } = useThemeStore();
  return (
    <PopupWrapper
      longitude={homeLocation.longitude}
      latitude={homeLocation.latitude}
      onClose={onClose}
      className={popupTheme}
      autoAnchor={true}
      mapRef={mapRef}
      closeOnClick={false}
      closeButton={true}
      offset={[0, -10]}
      maxWidth="380px"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <div
          className="min-w-[320px] bg-card text-card-foreground rounded-lg p-3 space-y-1"
          style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
        >
          <h3 className="text-lg font-semibold">Home</h3>
        </div>
      </div>
    </PopupWrapper>
  );
};

export default HomePopup; 