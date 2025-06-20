import React, { useState } from 'react';
import { PaneHeader } from '../shared/pane-header';
import { ThemeSelector } from '@/components/map/ThemeSelector';
import { useThemeStore } from '../../../stores/theme-store';
import { useDrawStore } from '../../../stores/draw';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MAP_STYLES } from '@/lib/constants';
import { StyleSelector } from '@/components/map/style-selector';
import { StyleOptions } from '@/components/draw/StyleOptions';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useMapStyleConfig } from '@/hooks/map/use-map-style-config';

interface StylePaneProps {
  onBack: () => void;
}

export function StylePane({ onBack }: StylePaneProps) {
  const { popupTheme, setTheme } = useThemeStore();
  const {
    lineColor,
    setLineColor,
    lineWidth,
    setLineWidth,
    polygonFillColor,
    setPolygonFillColor,
    polygonFillOpacity,
    setPolygonFillOpacity,
    polygonLineColor,
    setPolygonLineColor,
    polygonLineWidth,
    setPolygonLineWidth,
    pointColor,
    setPointColor,
    pointRadius,
    setPointRadius,
  } = useDrawStore(state => ({
    lineColor: state.lineColor,
    setLineColor: state.setLineColor,
    lineWidth: state.lineWidth,
    setLineWidth: state.setLineWidth,
    polygonFillColor: state.polygonFillColor,
    setPolygonFillColor: state.setPolygonFillColor,
    polygonFillOpacity: state.polygonFillOpacity,
    setPolygonFillOpacity: state.setPolygonFillOpacity,
    polygonLineColor: state.polygonLineColor,
    setPolygonLineColor: state.setPolygonLineColor,
    polygonLineWidth: state.polygonLineWidth,
    setPolygonLineWidth: state.setPolygonLineWidth,
    pointColor: state.pointColor,
    setPointColor: state.setPointColor,
    pointRadius: state.pointRadius,
    setPointRadius: state.setPointRadius,
  }));

  const [activeTab, setActiveTab] = useState<'themes' | 'mapstyle' | 'drawing'>('themes');
  const [selectedMapStyleId, setSelectedMapStyleId] = useState<string>(MAP_STYLES[0].id);
  const { mapRef } = useMapViewport();
  const mapStyleUrl = MAP_STYLES.find(s => s.id === selectedMapStyleId)?.url || MAP_STYLES[0].url;
  const { toggle3D, toggleTerrain } = useMapStyleConfig({ mapRef, mapStyleUrl });
  const [is3dEnabled, setIs3dEnabled] = useState<boolean>(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState<boolean>(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.2);

  React.useEffect(() => {
    toggle3D(is3dEnabled);
  }, [is3dEnabled, toggle3D]);
  React.useEffect(() => {
    toggleTerrain(isTerrainEnabled, terrainExaggeration);
  }, [isTerrainEnabled, terrainExaggeration, toggleTerrain]);

  return (
    <div className="flex flex-col h-full">
      <PaneHeader title="Style" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'themes' | 'mapstyle' | 'drawing')} className="p-4 space-y-4">
          <TabsList>
            <TabsTrigger value="themes">Interface Themes</TabsTrigger>
            <TabsTrigger value="mapstyle">Map Style</TabsTrigger>
            <TabsTrigger value="drawing">Drawing Styles</TabsTrigger>
          </TabsList>

          <TabsContent value="themes">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground mb-4">
                Choose a theme for the sidebar, popups, and overlays
              </p>
              <ThemeSelector currentTheme={popupTheme} onThemeChange={setTheme} />
            </div>
          </TabsContent>

          <TabsContent value="mapstyle">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground mb-4">
                Select a base map style
              </p>
              <StyleSelector
                styles={MAP_STYLES}
                currentStyleId={selectedMapStyleId}
                onStyleChange={(value) => setSelectedMapStyleId(value)}
              />
            </div>
            <div className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground mb-2">3D & Terrain</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show 3D Objects</span>
                <Switch checked={is3dEnabled} onCheckedChange={setIs3dEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable Terrain</span>
                <Switch checked={isTerrainEnabled} onCheckedChange={setIsTerrainEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Terrain Exaggeration</span>
                <Slider
                  value={[terrainExaggeration]}
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
              <p className="text-xs text-muted-foreground mb-4">
                Customize color and thickness of drawn features
              </p>
              <StyleOptions />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 