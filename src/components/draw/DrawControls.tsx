import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@/components/icons';
import { useDrawStore } from '@/stores/draw';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { DrawMode } from './draw-types';

interface DrawControlsProps {
  mapRef: React.RefObject<MapRef>;
}

export const DrawControls: React.FC<DrawControlsProps> = ({ mapRef }) => {
  const [mode, setMode] = useState<DrawMode>(null);
  const features = useDrawStore((s) => s.drawFeatures);
  const setFeatures = useDrawStore((s) => s.setDrawFeatures);
  const clearFeatures = useDrawStore((s) => s.clearDrawFeatures);

  // Portal target for mapbox top-right control group
  const [controlContainer, setControlContainer] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const drawRef = useRef<any>(null);

  // Create and insert control wrapper once
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const topRight = map.getContainer().querySelector('.mapboxgl-ctrl-top-right');
    if (!(topRight instanceof HTMLElement)) return;
    // Find geolocate control wrapper to place draw controls below it
    const geolocateEl = topRight.querySelector('.mapboxgl-ctrl.mapboxgl-ctrl-geolocate');
    const wrapper = document.createElement('div');
    // Use mapbox control group styling so buttons align with other controls
    wrapper.className = 'mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-draw-controls';
    if (geolocateEl && geolocateEl.parentElement) {
      geolocateEl.parentElement.insertBefore(wrapper, geolocateEl.nextSibling);
    } else {
      topRight.appendChild(wrapper);
    }
    wrapperRef.current = wrapper;
    setControlContainer(wrapper);
    return () => {
      if (wrapperRef.current && wrapperRef.current.parentElement) {
        wrapperRef.current.parentElement.removeChild(wrapperRef.current);
        wrapperRef.current = null;
      }
    };
  }, [mapRef]);

  // Initialize and configure Mapbox GL Draw plugin
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // Initialize plugin once
    if (!drawRef.current) {
      drawRef.current = new MapboxDraw({ displayControlsDefault: false });
      map.addControl(drawRef.current);
    }
    const draw = drawRef.current;
    // Sync drawn features into our store
    const updateFeaturesStore = () => {
      setFeatures(draw.getAll());
    };
    map.on('draw.create', updateFeaturesStore);
    map.on('draw.update', updateFeaturesStore);
    map.on('draw.delete', updateFeaturesStore);
    return () => {
      map.off('draw.create', updateFeaturesStore);
      map.off('draw.update', updateFeaturesStore);
      map.off('draw.delete', updateFeaturesStore);
    };
  }, [mapRef, setFeatures]);

  const buttons: { mode: DrawMode; icon: keyof typeof Icons; title: string }[] = [
    { mode: 'point', icon: 'MapPin', title: 'Draw Point' },
    { mode: 'line', icon: 'Edit', title: 'Draw Line' },
    { mode: 'polygon', icon: 'Circle', title: 'Draw Polygon' },
  ];

  // Render buttons directly to match Mapbox control styles
  const panel = (
    <>
      {buttons.map((btn) => {
        const IconComp = Icons[btn.icon];
        const isActive = mode === btn.mode;
        return (
          <button
            key={btn.mode || 'none'}
            type="button"
            title={btn.title}
            className={`mapboxgl-ctrl-icon${isActive ? ' mapboxgl-ctrl-draw-active' : ''}`}
            onClick={() => {
              if (!drawRef.current) return;
              const nextMode = mode === btn.mode ? null : btn.mode;
              setMode(nextMode);
              if (nextMode === 'point') drawRef.current.changeMode('draw_point');
              else if (nextMode === 'line') drawRef.current.changeMode('draw_line_string');
              else if (nextMode === 'polygon') drawRef.current.changeMode('draw_polygon');
              else drawRef.current.changeMode('simple_select');
            }}
          >
            <IconComp className="w-4 h-4" />
          </button>
        );
      })}
      <button
        type="button"
        title="Clear Drawings"
        className="mapboxgl-ctrl-icon mapboxgl-ctrl-draw-clear"
        onClick={() => {
          drawRef.current?.deleteAll();
          clearFeatures();
          setMode(null);
        }}
      >
        <Icons.Delete className="w-4 h-4 text-red-600" />
      </button>
    </>
  );
  return controlContainer ? createPortal(panel, controlContainer) : null;
};

export default DrawControls; 