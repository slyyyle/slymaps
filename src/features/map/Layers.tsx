"use client";

import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import { useDrawStore } from '@/stores/draw';
import type { LayerProps } from 'react-map-gl/mapbox';

interface LayersProps {
  directionsRouteLine: GeoJSON.Feature | null;
  directionsLayer: LayerProps;
  obaRouteSegments: GeoJSON.Feature[];
  obaRouteLayer: LayerProps;
}

const Layers: React.FC<LayersProps> = ({
  directionsRouteLine,
  directionsLayer,
  obaRouteSegments,
  obaRouteLayer
}) => {
  const drawFeatures = useDrawStore(state => state.drawFeatures);
  const lineColor = useDrawStore(state => state.lineColor);
  const lineWidth = useDrawStore(state => state.lineWidth);
  const polygonFillColor = useDrawStore(state => state.polygonFillColor);
  const polygonFillOpacity = useDrawStore(state => state.polygonFillOpacity);
  const polygonLineColor = useDrawStore(state => state.polygonLineColor);
  const polygonLineWidth = useDrawStore(state => state.polygonLineWidth);
  const pointColor = useDrawStore(state => state.pointColor);
  const pointRadius = useDrawStore(state => state.pointRadius);

  const drawPointLayer = useMemo<LayerProps>(() => ({
    id: 'draw-point-layer',
    type: 'circle',
    paint: { 'circle-radius': pointRadius, 'circle-color': pointColor },
    filter: ['==', ['geometry-type'], 'Point']
  }), [pointRadius, pointColor]);

  const drawLineLayer = useMemo<LayerProps>(() => ({
    id: 'draw-line-layer',
    type: 'line',
    paint: { 'line-color': lineColor, 'line-width': lineWidth, 'line-emissive-strength': 1 },
    filter: ['==', ['geometry-type'], 'LineString']
  }), [lineColor, lineWidth]);

  const drawPolygonFillLayer = useMemo<LayerProps>(() => ({
    id: 'draw-polygon-fill-layer',
    type: 'fill',
    paint: { 'fill-color': polygonFillColor, 'fill-opacity': polygonFillOpacity },
    filter: ['==', ['geometry-type'], 'Polygon']
  }), [polygonFillColor, polygonFillOpacity]);

  const drawPolygonLineLayer = useMemo<LayerProps>(() => ({
    id: 'draw-polygon-line-layer',
    type: 'line',
    paint: { 'line-color': polygonLineColor, 'line-width': polygonLineWidth, 'line-emissive-strength': 1 },
    filter: ['==', ['geometry-type'], 'Polygon']
  }), [polygonLineColor, polygonLineWidth]);

  return (
    <>
      {drawFeatures.features.length > 0 && (
        <Source id="draw-source" type="geojson" data={drawFeatures}>
          <Layer {...drawPolygonFillLayer} />
          <Layer {...drawPolygonLineLayer} />
          <Layer {...drawLineLayer} />
          <Layer {...drawPointLayer} />
        </Source>
      )}
      {directionsRouteLine && (
        <Source id="directions-source" type="geojson" data={directionsRouteLine}>
          <Layer {...directionsLayer} />
        </Source>
      )}
      {obaRouteSegments.length > 0 && (
        <Source
          id="oba-route-source"
          type="geojson"
          data={{ type: 'FeatureCollection', features: obaRouteSegments }}
        >
          <Layer {...obaRouteLayer} id="oba-route-layer" />
        </Source>
      )}
    </>
  );
};

export default Layers; 