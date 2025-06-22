import React from 'react';
import { useDrawStore } from '@/stores/draw';
import { ColorInput } from '@/components/ui/form/ColorInput';
import { SliderInput } from '@/components/ui/form/SliderInput';

export const StyleOptions: React.FC = () => {
  // Use individual selectors to keep snapshots stable and avoid infinite loops
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

  return (
    <div className="space-y-6">
      {/* Color controls in a 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <ColorInput
          id="line-color"
          label="Line Color"
          value={lineColor}
          onChange={setLineColor}
        />
        <ColorInput
          id="polygon-fill-color"
          label="Polygon Fill Color"
          value={polygonFillColor}
          onChange={setPolygonFillColor}
        />
        <ColorInput
          id="polygon-line-color"
          label="Polygon Border Color"
          value={polygonLineColor}
          onChange={setPolygonLineColor}
        />
        <ColorInput
          id="point-color"
          label="Point Color"
          value={pointColor}
          onChange={setPointColor}
        />
      </div>
      {/* Slider controls grouped below */}
      <div className="space-y-4">
        <SliderInput
          id="line-width"
          label="Line Thickness"
          min={1}
          max={10}
          step={1}
          value={lineWidth}
          onValueChange={setLineWidth}
        />
        <SliderInput
          id="polygon-fill-opacity"
          label="Polygon Fill Opacity"
          min={0}
          max={1}
          step={0.05}
          value={polygonFillOpacity}
          onValueChange={setPolygonFillOpacity}
        />
        <SliderInput
          id="polygon-line-width"
          label="Polygon Border Thickness"
          min={1}
          max={10}
          step={1}
          value={polygonLineWidth}
          onValueChange={setPolygonLineWidth}
        />
        <SliderInput
          id="point-radius"
          label="Point Radius"
          min={1}
          max={20}
          step={1}
          value={pointRadius}
          onValueChange={setPointRadius}
        />
      </div>
    </div>
  );
} 