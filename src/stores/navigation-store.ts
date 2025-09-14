import { create } from 'zustand';

export type NavigationMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface UserLocation {
	latitude: number;
	longitude: number;
	accuracy?: number | null;
	heading?: number | null;
	speed?: number | null;
	timestamp?: number | null;
}

interface NavigationState {
	isActive: boolean;
	isPreview: boolean;
	mode: NavigationMode | null;
	followingEnabled: boolean;
	currentLegIndex: number;
	nextManeuverText: string | null;
	lastUserLocation: UserLocation | null;
	startNavigation: (mode: NavigationMode) => void;
	startPreview: () => void;
	stopNavigation: () => void;
	setFollowingEnabled: (enabled: boolean) => void;
	setCurrentLegIndex: (index: number) => void;
	setNextManeuverText: (text: string | null) => void;
	updateLocation: (loc: UserLocation) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
	isActive: false,
	isPreview: false,
	mode: null,
	followingEnabled: true,
	currentLegIndex: 0,
	nextManeuverText: null,
	lastUserLocation: null,
	startNavigation: (mode) => set({ isActive: true, isPreview: false, mode, followingEnabled: true }),
	startPreview: () => set({ isActive: false, isPreview: true, mode: null }),
	stopNavigation: () => set({ isActive: false, isPreview: false, mode: null, followingEnabled: true }),
	setFollowingEnabled: (enabled) => set({ followingEnabled: enabled }),
	setCurrentLegIndex: (index) => set({ currentLegIndex: index }),
	setNextManeuverText: (text) => set({ nextManeuverText: text }),
	updateLocation: (loc) => set({ lastUserLocation: loc }),
})); 