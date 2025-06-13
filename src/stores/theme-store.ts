import { create } from 'zustand';

interface ThemeState {
  popupTheme: string;
  sidebarTheme: string;
  setPopupTheme: (theme: string) => void;
  setSidebarTheme: (theme: string) => void;
  setTheme: (theme: string) => void; // Set both popup and sidebar to same theme
}

export const useThemeStore = create<ThemeState>((set) => ({
  popupTheme: 'mapbox-popup-container dark', // Default to dark theme
  sidebarTheme: 'sidebar-container dark', // Matching sidebar theme
  setPopupTheme: (theme: string) => set({ popupTheme: theme }),
  setSidebarTheme: (theme: string) => set({ sidebarTheme: theme }),
  setTheme: (theme: string) => set({ 
    popupTheme: theme.replace('sidebar-container', 'mapbox-popup-container'),
    sidebarTheme: theme.replace('mapbox-popup-container', 'sidebar-container')
  }),
})); 