import React from 'react';
import { PaneHeader } from '../shared/pane-header';
import { ThemeSelector } from '../../map/ThemeSelector';
import { useThemeStore } from '../../../stores/theme-store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDrawStyleStore } from '../../../stores/use-draw-style-store';

interface StylePaneProps {
  onBack: () => void;
}

export function StylePane({ onBack }: StylePaneProps) {
  const { popupTheme, setTheme } = useThemeStore();
  const lineColor = useDrawStyleStore(state => state.lineColor);
  const setLineColor = useDrawStyleStore(state => state.setLineColor);
  const lineWidth = useDrawStyleStore(state => state.lineWidth);
  const setLineWidth = useDrawStyleStore(state => state.setLineWidth);
  const polygonFillColor = useDrawStyleStore(state => state.polygonFillColor);
  const setPolygonFillColor = useDrawStyleStore(state => state.setPolygonFillColor);
  const polygonFillOpacity = useDrawStyleStore(state => state.polygonFillOpacity);
  const setPolygonFillOpacity = useDrawStyleStore(state => state.setPolygonFillOpacity);
  const polygonLineColor = useDrawStyleStore(state => state.polygonLineColor);
  const setPolygonLineColor = useDrawStyleStore(state => state.setPolygonLineColor);
  const polygonLineWidth = useDrawStyleStore(state => state.polygonLineWidth);
  const setPolygonLineWidth = useDrawStyleStore(state => state.setPolygonLineWidth);
  const pointColor = useDrawStyleStore(state => state.pointColor);
  const setPointColor = useDrawStyleStore(state => state.setPointColor);
  const pointRadius = useDrawStyleStore(state => state.pointRadius);
  const setPointRadius = useDrawStyleStore(state => state.setPointRadius);

  return (
    <div className="flex flex-col h-full">
      <PaneHeader 
        title="Map Style" 
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Interface Themes</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose a theme for the sidebar, popups, and overlays
            </p>
            <ThemeSelector 
              currentTheme={popupTheme}
              onThemeChange={setTheme}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Drawing Styles</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Customize color and thickness of drawn features
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="line-color" className="text-xs">Line Color</Label>
                <input
                  id="line-color"
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="mt-1 block w-full h-10 p-0 border border-input rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="line-width" className="text-xs">Line Thickness</Label>
                <Slider
                  id="line-width"
                  min={1}
                  max={10}
                  step={1}
                  value={[lineWidth]}
                  onValueChange={([value]) => setLineWidth(value)}
                />
              </div>
              <div>
                <Label htmlFor="polygon-fill-color" className="text-xs">Polygon Fill Color</Label>
                <input
                  id="polygon-fill-color"
                  type="color"
                  value={polygonFillColor}
                  onChange={(e) => setPolygonFillColor(e.target.value)}
                  className="mt-1 block w-full h-10 p-0 border border-input rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="polygon-fill-opacity" className="text-xs">Polygon Fill Opacity</Label>
                <Slider
                  id="polygon-fill-opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[polygonFillOpacity]}
                  onValueChange={([value]) => setPolygonFillOpacity(value)}
                />
              </div>
              <div>
                <Label htmlFor="polygon-line-color" className="text-xs">Polygon Border Color</Label>
                <input
                  id="polygon-line-color"
                  type="color"
                  value={polygonLineColor}
                  onChange={(e) => setPolygonLineColor(e.target.value)}
                  className="mt-1 block w-full h-10 p-0 border border-input rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="polygon-line-width" className="text-xs">Polygon Border Thickness</Label>
                <Slider
                  id="polygon-line-width"
                  min={1}
                  max={10}
                  step={1}
                  value={[polygonLineWidth]}
                  onValueChange={([value]) => setPolygonLineWidth(value)}
                />
              </div>
              <div>
                <Label htmlFor="point-color" className="text-xs">Point Color</Label>
                <input
                  id="point-color"
                  type="color"
                  value={pointColor}
                  onChange={(e) => setPointColor(e.target.value)}
                  className="mt-1 block w-full h-10 p-0 border border-input rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="point-radius" className="text-xs">Point Radius</Label>
                <Slider
                  id="point-radius"
                  min={1}
                  max={20}
                  step={1}
                  value={[pointRadius]}
                  onValueChange={([value]) => setPointRadius(value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 