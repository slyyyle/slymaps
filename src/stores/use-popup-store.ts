import { create } from 'zustand'
import type { PopupStore, PopupSection, POI, CacheConfig } from '@/types/popup'

// Cache TTL configuration
const CACHE_TTL = {
  transit: 30 * 1000,           // 30 seconds (real-time data)
  hours: 60 * 60 * 1000,        // 1 hour (business hours)
  photos: 24 * 60 * 60 * 1000,  // 24 hours (static content)
  nearby: 5 * 60 * 1000,        // 5 minutes (POI data)
} as const;

const isCacheValid = (section: PopupSection, sectionType: string): boolean => {
  if (!section.lastFetched || section.status !== 'success') return false;
  const ttl = CACHE_TTL[sectionType as keyof typeof CACHE_TTL] || 60000;
  return (Date.now() - section.lastFetched) < ttl;
};

export const usePopupStore = create<PopupStore>((set, get) => ({
  sections: {},
  currentPOI: null,
    
    loadSection: async (sectionId: string, loader: () => Promise<any>) => {
      const existing = get().getSectionState(sectionId);
      
      // Check cache first - skip loading if valid
      if (isCacheValid(existing, sectionId)) {
        console.log(`📦 Using cached data for section: ${sectionId}`);
        return;
      }
      
      console.log(`🔄 Loading section: ${sectionId}`);
      
      // Set loading immediately
      set(state => ({
        sections: {
          ...state.sections,
          [sectionId]: { id: sectionId, status: 'loading' }
        }
      }));
      
      try {
        const data = await loader();
        set(state => ({
          sections: {
            ...state.sections,
            [sectionId]: { 
              id: sectionId, 
              status: 'success', 
              data,
              lastFetched: Date.now()
            }
          }
        }));
        
        console.log(`✅ Loaded section: ${sectionId}`);
      } catch (error: any) {
        set(state => ({
          sections: {
            ...state.sections,
            [sectionId]: { 
              id: sectionId, 
              status: 'error', 
              error: error.message || 'Unknown error'
            }
          }
        }));
        
        console.error(`❌ Failed to load section ${sectionId}:`, error);
      }
    },
    
    retrySection: async (sectionId: string, loader: () => Promise<any>) => {
      console.log(`🔄 Retrying section: ${sectionId}`);
      
      // Clear error state and retry
      set(state => ({
        sections: {
          ...state.sections,
          [sectionId]: { id: sectionId, status: 'idle' }
        }
      }));
      
      // Retry loading
      await get().loadSection(sectionId, loader);
    },
    
    clearSections: () => {
      console.log('🧹 Clearing all popup sections');
      set({ sections: {} });
    },
    
    setCurrentPOI: (poi: POI | null) => {
      const current = get().currentPOI;
      if (current?.id !== poi?.id) {
        console.log(`🎯 POI changed: ${current?.id} → ${poi?.id}`);
        set({ currentPOI: poi });
        
        // Clear sections when POI changes
        if (poi?.id !== current?.id) {
          get().clearSections();
        }
      }
    },
    
    getLoadedSections: () => {
      return Object.keys(get().sections).filter(
        key => get().sections[key].status === 'success'
      );
    },
    
    getSectionState: (sectionId: string) => {
      return get().sections[sectionId] || { id: sectionId, status: 'idle' };
    },
    
    isAnyLoading: () => {
      return Object.values(get().sections).some(s => s.status === 'loading');
    },
    
    hasErrors: () => {
      return Object.values(get().sections).some(s => s.status === 'error');
    },
  }));