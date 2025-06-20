import React from 'react';
import { useDrawStore } from '@/stores/draw';
import { ColorInput } from '@/components/ui/form/ColorInput';
import { SliderInput } from '@/components/ui/form/SliderInput';

export const StyleOptions: React.FC = () => {
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

  return (
    <div className="space-y-4">
      <ColorInput
        id="line-color"
        label="Line Color"
        value={lineColor}
        onChange={setLineColor}
      />
      <SliderInput
        id="line-width"
        label="Line Thickness"
        min={1}
        max={10}
        step={1}
        value={lineWidth}
        onValueChange={setLineWidth}
      />
      <ColorInput
        id="polygon-fill-color"
        label="Polygon Fill Color"
        value={polygonFillColor}
        onChange={setPolygonFillColor}
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
      <ColorInput
        id="polygon-line-color"
        label="Polygon Border Color"
        value={polygonLineColor}
        onChange={setPolygonLineColor}
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
      <ColorInput
        id="point-color"
        label="Point Color"
        value={pointColor}
        onChange={setPointColor}
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
);

} 