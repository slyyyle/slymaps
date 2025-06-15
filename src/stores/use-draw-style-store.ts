import { create } from 'zustand';

interface DrawStyleStore {
  lineColor: string;
  setLineColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  polygonFillColor: string;
  setPolygonFillColor: (color: string) => void;
  polygonFillOpacity: number;
  setPolygonFillOpacity: (opacity: number) => void;
  polygonLineColor: string;
  setPolygonLineColor: (color: string) => void;
  polygonLineWidth: number;
  setPolygonLineWidth: (width: number) => void;
  pointColor: string;
  setPointColor: (color: string) => void;
  pointRadius: number;
  setPointRadius: (radius: number) => void;
}

export const useDrawStyleStore = create<DrawStyleStore>((set) => ({
  lineColor: '#2563EB',
  setLineColor: (lineColor) => set({ lineColor }),
  lineWidth: 2,
  setLineWidth: (lineWidth) => set({ lineWidth }),
  polygonFillColor: '#2563EB',
  setPolygonFillColor: (polygonFillColor) => set({ polygonFillColor }),
  polygonFillOpacity: 0.3,
  setPolygonFillOpacity: (polygonFillOpacity) => set({ polygonFillOpacity }),
  polygonLineColor: '#2563EB',
  setPolygonLineColor: (polygonLineColor) => set({ polygonLineColor }),
  polygonLineWidth: 2,
  setPolygonLineWidth: (polygonLineWidth) => set({ polygonLineWidth }),
  pointColor: '#2563EB',
  setPointColor: (pointColor) => set({ pointColor }),
  pointRadius: 6,
  setPointRadius: (pointRadius) => set({ pointRadius }),
})); 