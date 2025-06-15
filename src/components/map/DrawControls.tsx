import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@/components/icons';
import { useDrawStore } from '@/stores/use-draw-store';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

export type DrawMode = 'point' | 'line' | 'polygon' | null;

interface DrawControlsProps {
  mapRef: React.RefObject<MapRef>;
}

const DrawControls: React.FC<DrawControlsProps> = ({ mapRef }) => {
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
    // Find geolocate control to place controls below it
    const geolocateEl = topRight.querySelector('.mapboxgl-ctrl-geolocate');
    const wrapper = document.createElement('div');
    // Mapbox control classes for consistent styling
    wrapper.className = 'mapboxgl-ctrl mapboxgl-ctrl-draw-controls';
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

  // Render into Mapbox control group when available
  const panel = (
    <div className="flex flex-col items-start gap-2 quick-settings-panel rounded-lg shadow-lg p-2">
      {buttons.map((btn) => {
        const IconComp = Icons[btn.icon];
        return (
          <button
            key={btn.mode || 'none'}
            onClick={() => {
              if (!drawRef.current) return;
              const nextMode = mode === btn.mode ? null : btn.mode;
              setMode(nextMode);
              if (nextMode === 'point') {
                drawRef.current.changeMode('draw_point');
              } else if (nextMode === 'line') {
                drawRef.current.changeMode('draw_line_string');
              } else if (nextMode === 'polygon') {
                drawRef.current.changeMode('draw_polygon');
              } else {
                drawRef.current.changeMode('simple_select');
              }
            }}
            title={btn.title}
            className={`p-2 rounded ${mode === btn.mode ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-200'}`}
          >
            <IconComp className="w-6 h-6" />
          </button>
        );
      })}
      <button
        onClick={() => {
          // Remove all features from the draw plugin and reset mode
          drawRef.current?.deleteAll();
          clearFeatures();
          setMode(null);
        }}
        title="Clear Drawings"
        className="p-2 rounded text-red-600"
      >
        <Icons.Delete className="w-6 h-6" />
      </button>
    </div>
  );
  return controlContainer ? createPortal(panel, controlContainer) : null;
};

export default DrawControls; 