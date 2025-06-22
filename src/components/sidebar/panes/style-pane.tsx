import React, { useState } from 'react';
import { ThemeSelector } from '@/components/map/ThemeSelector';
import { useThemeStore } from '../../../stores/theme-store';
import { useDrawStore } from '../../../stores/draw';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MAP_STYLES } from '@/lib/constants';
import { StyleOptions } from '@/components/draw/StyleOptions';
import { Slider } from '@/components/ui/slider';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useMapStyleConfig } from '@/hooks/map/use-map-style-config';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StylePaneProps {
  onBack: () => void;
}

export function StylePane({ onBack }: StylePaneProps) {
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
  const { mapRef, getMapInstance } = useMapViewport();
  const mapStyleUrl = MAP_STYLES[0].url;
  const { toggle3D, toggleTerrain } = useMapStyleConfig({ mapRef, mapStyleUrl });
  const [is3dEnabled, setIs3dEnabled] = useState<boolean>(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState<boolean>(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.2);

  const [zoom3DThreshold, setZoom3DThreshold] = useState<number>(15);
  const [zoomTerrainThreshold, setZoomTerrainThreshold] = useState<number>(12);

  // Memoize slider value arrays to keep references stable
  const zoom3DValue = React.useMemo(() => [zoom3DThreshold], [zoom3DThreshold]);
  const zoomTerrainValue = React.useMemo(() => [zoomTerrainThreshold], [zoomTerrainThreshold]);
  const terrainExaggValue = React.useMemo(() => [terrainExaggeration], [terrainExaggeration]);

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
              {/* 3D Zoom Threshold */}
              <div className="flex flex-col space-y-2">
                <div className="text-sm flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>3D Zoom Threshold ({zoom3DThreshold})</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      The map zoom level above which 3D buildings are enabled
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    className="flex-1"
                    value={zoom3DValue}
                    onValueChange={(vals) => setZoom3DThreshold(vals[0])}
                    min={0}
                    max={22}
                    step={0.1}
                  />
                  <Button size="sm" variant="secondary" onClick={() => {
                    toggle3D(!is3dEnabled);
                    const map = getMapInstance();
                    if (map) map.flyTo({ zoom: zoom3DThreshold });
                  }}>
                    Preview
                  </Button>
                </div>
              </div>
              {/* Terrain Zoom Threshold */}
              <div className="flex flex-col space-y-2">
                <div className="text-sm flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Terrain Zoom Threshold ({zoomTerrainThreshold})</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      The map zoom level above which terrain is enabled
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    className="flex-1"
                    value={zoomTerrainValue}
                    onValueChange={(vals) => setZoomTerrainThreshold(vals[0])}
                    min={0}
                    max={22}
                    step={0.1}
                  />
                  <Button size="sm" variant="secondary" onClick={() => {
                    toggleTerrain(!isTerrainEnabled, terrainExaggeration);
                    const map = getMapInstance();
                    if (map) map.flyTo({ zoom: zoomTerrainThreshold });
                  }}>
                    Preview
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
                  onValueChange={(vals) => setTerrainExaggeration(vals[0])}
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