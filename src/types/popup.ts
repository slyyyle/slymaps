// src/types/popup.ts - New types for enhanced popup system
import type { GeoJSONSource, MapMouseEvent, MapTouchEvent } from 'mapbox-gl'
import type { ObaArrivalDeparture, ObaNearbySearchResult } from './oba'
import type { OSMPoiData } from '../services/osm-service'

// Core POI interface that bridges your different POI sources
export interface POI {
  id: string
  name: string
  latitude: number  // Note: Your OBA uses latitude, OSM uses lat
  longitude: number // Note: Your OBA uses longitude, OSM uses lon
  type: string
  description?: string
  maki?: string
  osmId?: string
  source: 'mapbox' | 'search' | 'stored' | 'created' | 'osm'
  properties?: Record<string, any>
}

// Specific section data types
export interface TransitSectionData {
  stops: Array<{
    id: string
    name: string
    code: string
    direction?: string
    latitude: number
    longitude: number
    routeIds: string[]
    wheelchairBoarding?: string
    locationType?: number
  }>
  routes: Array<{
    id: string
    shortName: string
    longName?: string
    description?: string
    agencyId: string
    url?: string
    color?: string
    textColor?: string
    type?: number
  }>
  stopArrivals: Array<{
    stop: {
      id: string
      name: string
      code: string
      direction?: string
      latitude: number
      longitude: number
      routeIds: string[]
      distance?: number
    }
    arrivals: ObaArrivalDeparture[]
  }>
  searchLocation: {
    latitude: number
    longitude: number
    radius: number
  }
}

// Coordinate system bridge utilities
export interface Coordinates {
  latitude: number  // Matches existing core.ts Coordinates
  longitude: number // Matches existing core.ts Coordinates
}

export interface OSMCoordinates {
  lat: number
  lon: number
}

// Helper type for bridging coordinate systems
export type CoordinatesBridge = Coordinates | OSMCoordinates

// Mapbox GL JS v3.12 + React Map GL v8 event types
export type MapInteractionEvent = MapMouseEvent | MapTouchEvent
export interface MapFeature {
  properties: Record<string, any>
  geometry: {
    type: string
    coordinates: number[]
  }
  source?: string
  sourceLayer?: string
}

// Popup section state management
export type PopupSectionStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PopupSection<T = any> {
  id: string
  status: PopupSectionStatus
  data?: T
  error?: string
  lastFetched?: number
}

export interface HoursSectionData {
  opening_hours?: string
  formatted_hours?: string
  is_open_now?: boolean
  next_change?: string
  phone?: string
  website?: string
  operator?: string
  brand?: string
  source?: 'osm' | 'existing'
}

export interface PhotosSectionData {
  photos: Array<{
    url: string
    thumbnail: string
    attribution: string
  }>
}

export interface NearbySectionData {
  total: number
  categories: Record<string, any[]>
  topCategories: Array<[string, any[]]>
}

// Popup store state
export interface PopupStore {
  sections: Record<string, PopupSection>
  currentPOI: POI | null
  
  // Actions
  loadSection: <T>(sectionId: string, loader: () => Promise<T>) => Promise<void>
  clearSections: () => void
  setCurrentPOI: (poi: POI | null) => void
  
  // Computed selectors
  getSectionState: <T>(sectionId: string) => PopupSection<T>
  isAnyLoading: () => boolean
  getLoadedSections: () => string[]
}

// Progressive loader hook return type
export interface ProgressiveLoaderState {
  transitSection: PopupSection<TransitSectionData>
  hoursSection: PopupSection<HoursSectionData>
  nearbySection: PopupSection<NearbySectionData>
  photosSection: PopupSection<PhotosSectionData>
  startProgressiveLoad: () => void
  retrySection: (sectionId: string) => void
}

// Cache configuration
export interface CacheConfig {
  ttl: Record<string, number>
  maxEntries: number
} 