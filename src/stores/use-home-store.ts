import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Place, Coordinates } from '@/types/core';

interface HomeLocation extends Place {
  setAt: number;
  lastAccessedAt?: number;
}

interface HomeStoreState {
  homeLocation: HomeLocation | null;
  isSettingHome: boolean;
}

interface HomeStoreActions {
  setHomeLocation: (place: Place) => void;
  clearHomeLocation: () => void;
  updateLastAccessed: () => void;
  setIsSettingHome: (setting: boolean) => void;
  
  // Utility getters
  getHomeLocation: () => HomeLocation | null;
  getHomeCoordinates: () => Coordinates | null;
  hasHomeLocation: () => boolean;
}

type HomeStore = HomeStoreState & HomeStoreActions;

export const useHomeStore = create<HomeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      homeLocation: null,
      isSettingHome: false,

      // Actions
      setHomeLocation: (place: Place) => {
        const homeLocation: HomeLocation = {
          ...place,
          id: 'home',
          type: 'home',
          setAt: Date.now(),
          lastAccessedAt: Date.now(),
        };
        
        set({ 
          homeLocation,
          isSettingHome: false 
        });
      },

      clearHomeLocation: () => {
        set({ 
          homeLocation: null,
          isSettingHome: false 
        });
      },

      updateLastAccessed: () => {
        const { homeLocation } = get();
        if (homeLocation) {
          set({
            homeLocation: {
              ...homeLocation,
              lastAccessedAt: Date.now(),
            }
          });
        }
      },

      setIsSettingHome: (setting: boolean) => {
        set({ isSettingHome: setting });
      },

      // Utility getters
      getHomeLocation: () => get().homeLocation,
      
      getHomeCoordinates: () => {
        const home = get().homeLocation;
        return home ? { latitude: home.latitude, longitude: home.longitude } : null;
      },

      hasHomeLocation: () => get().homeLocation !== null,
    }),
    {
      name: 'home-location-storage',
      partialize: (state) => ({
        homeLocation: state.homeLocation,
        // Don't persist isSettingHome - it should reset on app reload
      }),
    }
  )
); 