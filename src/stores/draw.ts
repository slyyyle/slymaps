import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import type { FeatureCollection } from 'geojson';

interface DrawState {
  drawFeatures: FeatureCollection;
  lineColor: string;
  lineWidth: number;
  polygonFillColor: string;
  polygonFillOpacity: number;
  polygonLineColor: string;
  polygonLineWidth: number;
  pointColor: string;
  pointRadius: number;
}

interface DrawActions {
  setDrawFeatures: (features: FeatureCollection) => void;
  clearDrawFeatures: () => void;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setPolygonFillColor: (color: string) => void;
  setPolygonFillOpacity: (opacity: number) => void;
  setPolygonLineColor: (color: string) => void;
  setPolygonLineWidth: (width: number) => void;
  setPointColor: (color: string) => void;
  setPointRadius: (radius: number) => void;
}

export const useDrawStore = create(
  combine(
    {
      drawFeatures: { type: 'FeatureCollection', features: [] },
      lineColor: '#2563EB',
      lineWidth: 2,
      polygonFillColor: '#2563EB',
      polygonFillOpacity: 0.3,
      polygonLineColor: '#2563EB',
      polygonLineWidth: 2,
      pointColor: '#2563EB',
      pointRadius: 6,
    } as DrawState,
    (set): DrawActions => ({
      setDrawFeatures: (features) => set({ drawFeatures: features }),
      clearDrawFeatures: () => set({ drawFeatures: { type: 'FeatureCollection', features: [] } }),
      setLineColor: (lineColor) => set({ lineColor }),
      setLineWidth: (lineWidth) => set({ lineWidth }),
      setPolygonFillColor: (polygonFillColor) => set({ polygonFillColor }),
      setPolygonFillOpacity: (polygonFillOpacity) => set({ polygonFillOpacity }),
      setPolygonLineColor: (polygonLineColor) => set({ polygonLineColor }),
      setPolygonLineWidth: (polygonLineWidth) => set({ polygonLineWidth }),
      setPointColor: (pointColor) => set({ pointColor }),
      setPointRadius: (pointRadius) => set({ pointRadius }),
    })
  )
); 