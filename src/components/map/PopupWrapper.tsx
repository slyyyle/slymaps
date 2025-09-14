"use client";

import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/cn';
import type { MapRef } from 'react-map-gl/mapbox';

export interface PopupWrapperProps {
  children: React.ReactNode;
  longitude: number;
  latitude: number;
  onClose: () => void;
  className?: string;
  theme?: 'default' | 'dark' | 'high-contrast' | 'glass' | 'neon';
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoAnchor?: boolean;  // new: enable smart positioning based on viewport
  offset?: number | [number, number];
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
  mapRef?: React.RefObject<MapRef>;
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
  anchor: propAnchor = 'bottom',
  autoAnchor = false,
  offset = [0, -10],
  mapRef,
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

  // State for dynamic anchor and offset
  const [computedAnchor, setComputedAnchor] = React.useState<PopupWrapperProps['anchor']>(propAnchor);
  const [computedOffset, setComputedOffset] = React.useState<[number, number]>(
    Array.isArray(offset) ? offset : [0, offset]
  );
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Recalculate anchor & offset based on content position and map movements
  React.useLayoutEffect(() => {
    if (!autoAnchor || !contentRef.current) return;
    const mapInstance = mapRef?.current?.getMap();
    const initialOffset: [number, number] = Array.isArray(offset) ? offset : [0, offset];

    const updatePosition = () => {
      const rect = contentRef.current!.getBoundingClientRect();
      const anchors: string[] = [];
      if (rect.top < 0) anchors.push('bottom');
      else if (rect.bottom > window.innerHeight) anchors.push('top');
      if (rect.left < 0) anchors.push('right');
      else if (rect.right > window.innerWidth) anchors.push('left');

      let newAnchor = propAnchor!;
      if (anchors.length === 2) {
        newAnchor = `${anchors[0]}-${anchors[1]}` as Exclude<PopupWrapperProps['anchor'], undefined>;
      } else if (anchors.length === 1) {
        newAnchor = anchors[0] as Exclude<PopupWrapperProps['anchor'], undefined>;
      }

      const absX = Math.abs(initialOffset[0]);
      const absY = Math.abs(initialOffset[1]);
      let x = initialOffset[0];
      let y = initialOffset[1];
      if (newAnchor.includes('top')) y = absY;
      else if (newAnchor.includes('bottom')) y = -absY;
      if (newAnchor.includes('left')) x = absX;
      else if (newAnchor.includes('right')) x = -absX;

      setComputedAnchor(newAnchor);
      setComputedOffset([x, y]);
    };

    // Initial positioning
    // Delay first run to allow children to render
    updatePosition();
    // Recompute on window resize and map movements
    window.addEventListener('resize', updatePosition);
    mapInstance?.on('move', updatePosition);
    // Recompute on content size changes
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(contentRef.current);
    return () => {
      window.removeEventListener('resize', updatePosition);
      mapInstance?.off('move', updatePosition);
      resizeObserver.disconnect();
    };
  }, [autoAnchor, propAnchor, offset, longitude, latitude, mapRef]);

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      anchor={autoAnchor ? computedAnchor : propAnchor}
      // @ts-ignore: offset prop may not exist on PopupProps
      offset={autoAnchor ? computedOffset : offset}
      closeButton={closeButton}
      closeOnClick={closeOnClick}
      maxWidth={maxWidth}
      className={cn(themeClasses[theme], className)}
      {...props}
    >
      <div ref={contentRef} className="popup-content-wrapper popup-reset" style={{ zIndex: 1100 }}>
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