"use client";

import React from 'react';
import { Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/cn';

export interface PopupWrapperProps {
  children: React.ReactNode;
  longitude: number;
  latitude: number;
  onClose: () => void;
  className?: string;
  theme?: 'default' | 'dark' | 'high-contrast' | 'glass' | 'neon';
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset?: number | [number, number];
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
  [key: string]: any; // Allow other Popup props
}

/**
 * Modern PopupWrapper component that seamlessly integrates shadcn/ui components
 * with Mapbox GL popups using CSS layers for proper cascade control.
 * 
 * Features:
 * - Zero !important declarations needed
 * - Proper CSS variable scoping for shadcn components
 * - Multiple theme variants
 * - Full accessibility support
 * - Mobile responsive
 */
export const PopupWrapper: React.FC<PopupWrapperProps> = ({
  children,
  longitude,
  latitude,
  onClose,
  className = '',
  theme = 'default',
  anchor = 'bottom',
  offset = [0, -10],
  closeButton = false, // We handle this in children typically
  closeOnClick = false,
  maxWidth = '420px',
  ...props
}) => {
  const themeClasses = {
    default: 'mapbox-popup-container',
    dark: 'mapbox-popup-container dark',
    'high-contrast': 'mapbox-popup-container [&]:bg-white [&]:border-black [&]:border-2',
    glass: 'mapbox-popup-container [&_.mapboxgl-popup-content]:backdrop-filter-blur-xl',
    neon: 'mapbox-popup-container [&]:bg-black [&]:border-cyan-400 [&]:shadow-cyan-400/50',
  };

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      anchor={anchor}
      offset={offset}
      closeButton={closeButton}
      closeOnClick={closeOnClick}
      maxWidth={maxWidth}
      className={cn(themeClasses[theme], className)}
      {...props}
    >
      <div className="popup-content-wrapper popup-reset">
        {children}
      </div>
    </Popup>
  );
};

/**
 * Utility hook for debugging popup styling issues
 */
export const usePopupDebug = (enabled: boolean = false) => {
  React.useEffect(() => {
    if (enabled) {
      document.body.classList.add('debug-popups');
    } else {
      document.body.classList.remove('debug-popups');
    }

    return () => {
      document.body.classList.remove('debug-popups');
    };
  }, [enabled]);
};

export default PopupWrapper; 