import { useCallback, useMemo } from 'react';
import { usePlaceStore } from '@/stores/use-place-store';
import type { Place } from '@/types/core';

export function usePlaceIntegration() {
  const store = usePlaceStore();

  // Selectors
  const allPlaces = useMemo(() => store.getAllPOIs(), [store]);
  const activeSelection = store.getActiveSelection();
  const activePlace = activeSelection?.poi ?? null;

  // Place operations
  const getAllPlaces = useCallback((): Place[] => allPlaces, [allPlaces]);
  const getActivePlace = useCallback((): Place | null => activePlace, [activePlace]);
  const addStoredPlace = useCallback((place: Place) => store.addStoredPlace(place), [store]);
  const updateStoredPlace = useCallback((id: string, updates: Partial<any>) => store.updateStoredPlace(id, updates), [store]);
  const deleteStoredPlace = useCallback((id: string) => store.deleteStoredPlace(id), [store]);
  const toggleFavorite = useCallback((id: string) => store.toggleFavorite(id), [store]);

  // Search result operations
  const addSearchResult = useCallback((place: Place, query: string) => store.addSearchResult(place, query), [store]);
  const getSearchResults = useCallback(() => store.getSearchResults(), [store]);
  const clearSearchResults = useCallback(() => store.clearSearchResults(), [store]);
  const deleteSearchResult = useCallback((id: string) => store.deleteSearchResult(id), [store]);
  const promoteSearchResultToStored = useCallback((id: string) => store.promoteSearchResultToStored(id), [store]);

  // Created place operations
  const addCreatedPlace = useCallback((place: Place, data?: Partial<any>) => store.addCreatedPlace(place, data), [store]);
  const updateCreatedPlace = useCallback((id: string, updates: Partial<any>) => store.updateCreatedPlace(id, updates), [store]);
  const deleteCreatedPlace = useCallback((id: string) => store.deleteCreatedPlace(id), [store]);

  // Selection
  const selectPlace = useCallback((place: Place, type: string) => store.selectPOI(place, type as any), [store]);
  const clearPlaceSelection = useCallback(() => store.clearSelection(), [store]);

  // Cache
  const getNearbyCache = useCallback((params: any) => store.getNearbyCache(params), [store]);
  const setNearbyCache = useCallback((params: any, places: Place[]) => store.setNearbyCache(params, places), [store]);

  return {
    allPlaces,
    activePlace,
    getAllPlaces,
    getActivePlace,
    addStoredPlace,
    updateStoredPlace,
    deleteStoredPlace,
    toggleFavorite,
    addSearchResult,
    getSearchResults,
    clearSearchResults,
    deleteSearchResult,
    promoteSearchResultToStored,
    addCreatedPlace,
    updateCreatedPlace,
    deleteCreatedPlace,
    selectPlace,
    clearPlaceSelection,
    getNearbyCache,
    setNearbyCache,
  };
} 