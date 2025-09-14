import React, { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { ThemeSelector } from '@/components/map/ThemeSelector';
import { useThemeStore } from '../../../stores/theme-store';
import { useDrawStore } from '../../../stores/draw';
import { useTerrainStore } from '../../../stores/terrain-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MAP_STYLES } from '@/lib/constants';
import { StyleOptions } from '@/components/draw/StyleOptions';
import { Slider } from '@/components/ui/slider';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useMapStyleConfig } from '@/hooks/map/use-map-style-config';
import { useMapStyling } from '@/hooks/map/use-map-styling';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StylePaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export function StylePane({ onBack, mapRef }: StylePaneProps) {
  const { popupTheme, setTheme } = useThemeStore();
  // Draw store properties
  const lineColor = useDrawStore(state => state.lineColor);
  const setLineColor = useDrawStore(state => state.setLineColor);
  const lineWidth = useDrawStore(state => state.lineWidth);
  const setLineWidth = useDrawStore(state => state.setLineWidth);
  const polygonFillColor = useDrawStore(state => state.polygonFillColor);
  const setPolygonFillColor = useDrawStore(state => state.setPolygonFillColor);
  const polygonFillOpacity = useDrawStore(state => state.polygonFillOpacity);
  const setPolygonFillOpacity = useDrawStore(state => state.setPolygonFillOpacity);
  const polygonLineColor = useDrawStore(state => state.polygonLineColor);
  const setPolygonLineColor = useDrawStore(state => state.setPolygonLineColor);
  const polygonLineWidth = useDrawStore(state => state.polygonLineWidth);
  const setPolygonLineWidth = useDrawStore(state => state.setPolygonLineWidth);
  const pointColor = useDrawStore(state => state.pointColor);
  const setPointColor = useDrawStore(state => state.setPointColor);
  const pointRadius = useDrawStore(state => state.pointRadius);
  const setPointRadius = useDrawStore(state => state.setPointRadius);

  const [activeTab, setActiveTab] = useState<'themes' | 'mapstyle' | 'drawing'>('themes');
  
  // Use the passed mapRef if available, otherwise fall back to useMapViewport
  const { mapRef: viewportMapRef, getMapInstance } = useMapViewport();
  const effectiveMapRef = mapRef || viewportMapRef;
  
  const mapStyling = useMapStyling(effectiveMapRef);
  const mapStyleUrl = mapStyling.currentMapStyle.url;
  const { toggle3D, toggleTerrain, setTerrainExaggeration: setMapTerrainExaggeration, setTerrainCutoff } = useMapStyleConfig({ mapRef: effectiveMapRef, mapStyleUrl });
  
  // Use terrain store instead of local state
  const {
    is3DEnabled,
    isTerrainEnabled,
    terrainExaggeration,
    cutoffEnabled,
    set3DEnabled,
    setTerrainEnabled,
    setTerrainExaggeration: setStoreTerrainExaggeration,
    setCutoffEnabled
  } = useTerrainStore();

  // Memoize slider value arrays to keep references stable
  const terrainExaggValue = React.useMemo(() => [terrainExaggeration], [terrainExaggeration]);

  // Apply 3D on mount if not already enabled (debounced)
  React.useEffect(() => {
    if (is3DEnabled || !effectiveMapRef?.current) return;
    
    const timeoutId = setTimeout(() => {
      if (effectiveMapRef?.current) {
        toggle3D(true);
        set3DEnabled(true);
      }
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [effectiveMapRef, is3DEnabled, toggle3D, set3DEnabled]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'themes' | 'mapstyle' | 'drawing')} className="p-4 space-y-4">
          <TabsList>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="mapstyle">3D Terrain</TabsTrigger>
            <TabsTrigger value="drawing">Drawing</TabsTrigger>
          </TabsList>

          <TabsContent value="themes">
            <div className="space-y-4">
              <ThemeSelector currentTheme={popupTheme} onThemeChange={setTheme} />
            </div>
          </TabsContent>

          <TabsContent value="mapstyle">
            <div className="space-y-6 pt-4">
              {/* 3D Buildings Toggle */}
              <div className="flex flex-col space-y-2">
                <div className="text-sm flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>3D Buildings</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Enable or disable 3D buildings on the map
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button 
                  size="sm" 
                  variant={is3DEnabled ? "default" : "secondary"} 
                  onClick={() => {
                    toggle3D(!is3DEnabled);
                    set3DEnabled(!is3DEnabled);
                  }}
                >
                  {is3DEnabled ? "Disable 3D" : "Enable 3D"}
                  </Button>
              </div>
              
              {/* Terrain Toggle */}
              <div className="flex flex-col space-y-2">
                <div className="text-sm flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>3D Terrain</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Enable or disable 3D terrain on the map
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button 
                  size="sm" 
                  variant={isTerrainEnabled ? "default" : "secondary"} 
                  onClick={() => {
                    toggleTerrain(!isTerrainEnabled, terrainExaggeration);
                    setTerrainEnabled(!isTerrainEnabled);
                  }}
                >
                  {isTerrainEnabled ? "Disable Terrain" : "Enable Terrain"}
                  </Button>
                {/* Terrain Cutoff */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Terrain Cutoff</span>
                  <Button
                    size="sm"
                    variant={cutoffEnabled ? 'default' : 'secondary'}
                    onClick={() => {
                      const next = !cutoffEnabled;
                      setCutoffEnabled(next);
                      setTerrainCutoff(next);
                    }}
                  >
                    {cutoffEnabled ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
              
              {/* Terrain Exaggeration */}
              <div className="flex flex-col space-y-2">
                <div className="text-sm flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Terrain Exaggeration ({terrainExaggeration})</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Controls how "tall" terrain appears when enabled (higher = more relief)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  value={terrainExaggValue}
                  onValueChange={(vals) => {
                    const newExaggeration = vals[0];
                    setStoreTerrainExaggeration(newExaggeration);
                    
                    // Always enable terrain with the new exaggeration
                    toggleTerrain(true, newExaggeration);
                    setTerrainEnabled(true);
                  }}
                  min={1}
                  max={5}
                  step={0.1}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="drawing">
            <div className="space-y-4">
              <StyleOptions />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 