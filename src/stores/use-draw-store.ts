import { create } from 'zustand';
import type { FeatureCollection } from 'geojson';

interface DrawStore {
  drawFeatures: FeatureCollection;
  setDrawFeatures: (features: FeatureCollection) => void;
  clearDrawFeatures: () => void;
}

export const useDrawStore = create<DrawStore>((set) => ({
  drawFeatures: { type: 'FeatureCollection', features: [] },
  setDrawFeatures: (features: FeatureCollection) => set({ drawFeatures: features }),
  clearDrawFeatures: () => set({ drawFeatures: { type: 'FeatureCollection', features: [] } }),
})); 