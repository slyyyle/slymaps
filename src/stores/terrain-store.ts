import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TerrainState {
	is3DEnabled: boolean;
	isTerrainEnabled: boolean;
	terrainExaggeration: number;
	cutoffEnabled: boolean;
}

interface TerrainActions {
	set3DEnabled: (enabled: boolean) => void;
	setTerrainEnabled: (enabled: boolean) => void;
	setTerrainExaggeration: (exaggeration: number) => void;
	setCutoffEnabled: (enabled: boolean) => void;
	resetToDefaults: () => void;
}

type TerrainStore = TerrainState & TerrainActions;

export const useTerrainStore = create<TerrainStore>()(
	persist(
		(set) => ({
			// Initial state
			is3DEnabled: true,
			isTerrainEnabled: false,
			terrainExaggeration: 1.2,
			cutoffEnabled: true,

			// Actions
			set3DEnabled: (enabled: boolean) => set({ is3DEnabled: enabled }),
			setTerrainEnabled: (enabled: boolean) => set({ isTerrainEnabled: enabled }),
			setTerrainExaggeration: (exaggeration: number) => set({ terrainExaggeration: exaggeration }),
			setCutoffEnabled: (enabled: boolean) => set({ cutoffEnabled: enabled }),
			resetToDefaults: () => set({
				is3DEnabled: true,
				isTerrainEnabled: false,
				terrainExaggeration: 1.2,
				cutoffEnabled: true,
			}),
		}),
		{
			name: 'terrain-settings-storage',
			partialize: (state) => ({
				is3DEnabled: state.is3DEnabled,
				isTerrainEnabled: state.isTerrainEnabled,
				terrainExaggeration: state.terrainExaggeration,
				cutoffEnabled: state.cutoffEnabled,
			}),
		}
	)
); 