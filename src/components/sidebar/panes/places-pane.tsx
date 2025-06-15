import React from 'react';
import { PaneHeader } from '../shared/pane-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { Icons } from '@/components/icons';
import type { PointOfInterest } from '@/types/core';
import { OSMDescription } from '@/components/popup/osm_description';
import type { MapRef } from 'react-map-gl/mapbox';
import { cn } from '@/lib/cn';

interface PlacesPaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
  compact?: boolean;
}

// Utility functions for pretty transit property formatting
const formatTransitMode = (mode: string): string => {
  const modeMap: Record<string, string> = {
    'bus': 'Bus',
    'rail': 'Rail',
    'light_rail': 'Light Rail', 
    'subway': 'Subway',
    'metro': 'Metro',
    'ferry': 'Ferry',
    'cable_car': 'Cable Car',
    'monorail': 'Monorail',
    'funicular': 'Funicular',
    'trolleybus': 'Trolley',
    'share_taxi': 'Share Taxi',
    'aerialway': 'Aerial Lift',
    'tram': 'Tram',
  };
  
  return modeMap[mode?.toLowerCase()] || mode?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Transit';
};

// Returns a React node (string emoji) for transit icons
const getTransitIcon = (maki?: string): React.ReactNode => {
  const iconMap: Record<string, string> = {
    'rail-light': '🚋',
    'rail': '🚆',
    'bus': '🚌',
    'subway': '🚇',
    'metro': '🚇',
    'ferry': '⛴️',
    'airport': '✈️',
    'cable-car': '🚠',
    'monorail': '🚝',
  };
  
  return iconMap[maki?.toLowerCase() || ''] || '🚌';
};

// Utility function to format POI types nicely with smart capitalization (shared with StandardMapView)
const formatPoiType = (type: string): string => {
  if (!type) return 'Point of Interest';
  
  // Handle a few specific edge cases that don't follow the pattern
  const specialCases: Record<string, string> = {
    'poi': 'Point of Interest',
    'atm': 'ATM',
    'search_result': 'Search Result',
    'oba_stop': 'Transit Stop'
  };
  
  const lowerType = type.toLowerCase();
  if (specialCases[lowerType]) {
    return specialCases[lowerType];
  }
  
  // Filler words that should not be capitalized
  const fillerWords = new Set(['of', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'to']);
  
  // Smart formatting: replace underscores, capitalize words, handle "and" → "&"
  return type
    .split(/[_\s]+/) // Split on underscores and spaces
    .map((word: string, index: number) => {
      const cleanWord = word.toLowerCase();
      
      // Replace "and" with "&"
      if (cleanWord === 'and') return '&';
      
      // Don't capitalize filler words unless they're the first word
      if (index > 0 && fillerWords.has(cleanWord)) {
        return cleanWord;
      }
      
      // Capitalize first letter of all other words
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    })
    .join(' ');
};

// Simple distance calculation function
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)} ft`;
  } else {
    return `${distance.toFixed(1)} mi`;
  }
};

export function PlacesPane({ onBack, mapRef, compact = false }: PlacesPaneProps) {
  const dataIntegration = useDataIntegration();
  // Pull recent search history
  // const recentSearches = dataIntegration.searches.getRecentSearches();
  
  // Get all POIs from the store (now including favorites flag)
  const allPois = dataIntegration.pois.getAllPOIs();
  // Separate out saved (favorited) POIs
  const savedPois = allPois.filter(poi => poi.favorites);
  const currentLocation = dataIntegration.location.getCurrentLocation();
  
  // Categorize POIs
  const searchResultPois = allPois.filter(poi => poi.isSearchResult && !poi.favorites);
  const nativePois = allPois.filter(poi => (poi.isNativePoi || poi.id.startsWith('native-poi-')) && !poi.favorites);
  const customPois = allPois.filter(poi => !poi.isSearchResult && !poi.isNativePoi && !poi.id.startsWith('native-poi-') && !poi.favorites);
  
  const handleDeletePoi = (poiId: string, poiName: string) => {
    console.log(`🗑️ Deleting POI: ${poiName} (${poiId})`);
    dataIntegration.pois.deletePOI(poiId);
  };
  
  const handleSelectPoi = (poi: PointOfInterest) => {
    dataIntegration.pois.selectPOI(poi.id);
    // Close sidebar on mobile or keep open on desktop
    // User can manually close if needed
  };
  
  const handleClearAllSearchResults = () => {
    console.log('🧹 Clearing all search result POIs from Places pane');
    dataIntegration.pois.clearSearchResults();
  };
  
  const handleClearAllNative = () => {
    console.log('🧹 Clearing all native POIs from Places pane');
    nativePois.forEach(poi => {
      dataIntegration.pois.deletePOI(poi.id);
    });
  };

  const renderPoiCard = (poi: PointOfInterest, _category: string) => {
    const distance = currentLocation ? 
      calculateDistance(
        currentLocation.latitude, 
        currentLocation.longitude, 
        poi.latitude, 
        poi.longitude
      ) : null;

    const props = poi.properties as Record<string, unknown> | undefined;
    const isTransit = props?.group === 'transit';

    return (
      <Card key={poi.id} className="mb-2">
        <CardHeader className={compact ? "px-3 py-1" : "px-4 py-2"}>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-col space-y-0.5">
              <div className="flex items-center gap-1">
                {isTransit && props?.maki && typeof props.maki === 'string' ? (
                  <span className="text-base" style={{ color: 'hsl(var(--foreground))' }}>{getTransitIcon(props.maki)}</span>
                ) : null}
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{poi.name}</span>
              </div>
              {poi.description && (
                <OSMDescription address={poi.description} />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { handleSelectPoi(poi); if (mapRef?.current) { mapRef.current.getMap().flyTo({ center: [poi.longitude, poi.latitude], zoom: 15 }); } }}
                className="h-6 w-6 p-0"
                title="Fly to POI"
              >
                <Icons.MapPin className="h-4 w-4" />
              </Button>
              {_category === 'search' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dataIntegration.pois.favoritePOI(poi.id, !poi.favorites)}
                  className={`h-6 w-6 p-0 ${poi.favorites ? 'text-destructive' : 'text-muted-foreground'}`}
                  title={poi.favorites ? 'Unsave' : 'Save'}
                >
                  <Icons.Heart className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeletePoi(poi.id, poi.name)}
                className="h-6 w-6 p-0 text-destructive"
                title="Delete POI"
              >
                <Icons.X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className={cn("flex flex-col", compact ? "" : "h-full")}>
      {!compact && (
        <PaneHeader 
          title="Places" 
          onBack={onBack}
        />
      )}
      
      <ScrollArea className={compact ? "flex-1 px-3 py-1" : "flex-1 p-4"}>
        <div className={compact ? "space-y-1" : "space-y-4"}>
          
          {/* Saved POIs Section */}
          {savedPois.length > 0 && (
            <div>
              <div className={cn("flex items-center justify-between", compact ? "mb-1" : "mb-2")}>
                <div className="flex items-center gap-1">
                  <h3 className={cn(compact ? "text-xs" : "text-[13px]", "font-medium")}>Saved POIs</h3>
                  <Badge variant="secondary" className="text-xs">{savedPois.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => savedPois.forEach(poi => dataIntegration.pois.deletePOI(poi.id))}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              </div>
              {savedPois.map(poi => renderPoiCard(poi, 'favorite'))}
            </div>
          )}
          
          {/* Search Results Section */}
          {searchResultPois.length > 0 && (
            <div>
              <div className={cn("flex items-center justify-between", compact ? "mb-1" : "mb-2")}>
                <div className="flex items-center gap-1">
                  <h3 className={cn(compact ? "text-xs" : "text-[13px]", "font-medium")}>Search Results</h3>
                  <Badge variant="secondary" className="text-xs">
                    {searchResultPois.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllSearchResults}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              </div>
              {searchResultPois.map(poi => renderPoiCard(poi, 'search'))}
            </div>
          )}
          
          {/* Native POIs Section */}
          {nativePois.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Native POIs</h3>
                  <Badge variant="secondary" className="text-xs">
                    {nativePois.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllNative}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              </div>
              {nativePois.map(poi => renderPoiCard(poi, 'native'))}
            </div>
          )}
          
          {/* Custom POIs Section */}
          {customPois.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium">Custom POIs</h3>
                <Badge variant="secondary" className="text-xs">
                  {customPois.length}
                </Badge>
              </div>
              {customPois.map(poi => renderPoiCard(poi, 'custom'))}
            </div>
          )}
          
          {/* Empty State */}
          {allPois.length === 0 && (
            <div className="text-center pt-8">
              <Icons.MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-sm font-medium mb-2">No searches yet</h3>
              <p className="text-xs text-muted-foreground">
                Recent searches will appear here for quick pinning!
              </p>
            </div>
          )}
          
          {/* Development Tools - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-4 mt-6">
              <h3 className="text-sm font-medium mb-3 text-orange-600">🛠️ Dev Tools</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Reset entire store? This will clear all data.')) {
                      const { resetStore, exportData } = dataIntegration.diagnostics;
                      console.log('📁 Store before reset:', exportData());
                      resetStore();
                      window.location.reload(); // Force refresh after reset
                    }
                  }}
                  className="w-full text-xs"
                >
                  🗑️ Reset Entire Store
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const stats = dataIntegration.diagnostics.getDataStats();
                    console.log('📊 Store Stats:', stats);
                    alert(`POIs: ${stats.poisCount}, Routes: ${stats.routesCount}, Searches: ${stats.searchesCount}`);
                  }}
                  className="w-full text-xs"
                >
                  📊 Show Store Stats
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dataIntegration.diagnostics.cleanupExpiredData();
                    console.log('🧹 Cleaned up expired data');
                  }}
                  className="w-full text-xs"
                >
                  🧹 Clean Expired Data
                </Button>
              </div>
            </div>
          )}
          
        </div>
      </ScrollArea>
    </div>
  );
} 