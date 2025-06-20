"use client";

import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { Loader2 } from 'lucide-react';

interface GenericPopupProps {
  longitude: number;
  latitude: number;
  onClose: () => void;
  popupTheme: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

const GenericPopup: React.FC<GenericPopupProps> = ({
  longitude,
  latitude,
  onClose,
  popupTheme,
  isLoading = false,
  children
}) => (
  <Popup
    longitude={longitude}
    latitude={latitude}
    onClose={onClose}
    closeOnClick={false}
    closeButton={true}
    anchor="bottom"
    offset={[0, -10]}
    maxWidth="380px"
    className={popupTheme}
  >
    <div onClick={(e) => e.stopPropagation()}>
      {isLoading ? (
        <div 
          className="min-w-[320px] bg-card text-card-foreground rounded-lg p-4 flex flex-col items-center justify-center py-8 space-y-3"
          style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      ) : (
        children
      )}
    </div>
  </Popup>
);

export default GenericPopup; 