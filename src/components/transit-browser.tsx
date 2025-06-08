"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useToastingDataFetcher } from '@/hooks/use-data-fetcher';
import { 
  getPopularRoutes, 
  findNearbyTransit, 
  getAgenciesWithCoverage,
  searchRoutesByName,
  searchStops
} from '@/services/oba';
import type { 
  ObaRouteSearchResult, 
  ObaNearbySearchResult, 
  ObaStopSearchResult,
  Coordinates 
} from '@/types';

interface TransitBrowserProps {
  onRouteSelect: (routeId: string) => void;
  onStopSelect: (stopId: string, stopName: string, coords: Coordinates) => void;
  onFlyTo: (coords: Coordinates) => void;
  currentLocation?: Coordinates;
  isLoadingRoute: boolean;
}

type BrowseMode = 'popular' | 'nearby' | 'search' | 'agencies' | 'favorites';

export function TransitBrowser({
  onRouteSelect,
  onStopSelect,
  onFlyTo,
  currentLocation,
  isLoadingRoute,
}: TransitBrowserProps) {
  // Mode state
  const [activeMode, setActiveMode] = useState<BrowseMode>('popular');
  const [enabledModes, setEnabledModes] = useState<Set<BrowseMode>>(
    new Set(['popular', 'nearby', 'search'])
  );

  // Data state
  const [popularRoutes, setPopularRoutes] = useState<ObaRouteSearchResult[]>([]);
  const [nearbyTransit, setNearbyTransit] = useState<ObaNearbySearchResult | null>(null);
  const [agencies, setAgencies] = useState<Record<string, unknown>[]>([]);
  const [searchResults, setSearchResults] = useState<{
    routes: ObaRouteSearchResult[];
    stops: ObaStopSearchResult[];
  }>({ routes: [], stops: [] });
  const [favorites, setFavorites] = useState<{
    routes: string[];
    stops: string[];
  }>({ routes: [], stops: [] });

  // Loading states
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'routes' | 'stops'>('routes');

  const { toast } = useToast();

  const loadPopularRoutes = useToastingDataFetcher({
    fetcher: () => getPopularRoutes(25),
    setData: setPopularRoutes,
    setLoading: setIsLoadingPopular,
    toastErrorTitle: 'Error Loading Popular Routes',
    toastErrorMessage: 'Could not load popular routes. Please try again.',
      });

  const loadNearbyTransit = useToastingDataFetcher({
    fetcher: async () => {
      if (!currentLocation) return null;
      return findNearbyTransit(currentLocation, 800);
    },
    setData: setNearbyTransit,
    setLoading: setIsLoadingNearby,
    toastErrorTitle: 'Error Loading Nearby Transit',
    toastErrorMessage: 'Could not find nearby transit. Make sure location is enabled.',
  });

  const loadAgencies = useToastingDataFetcher({
    fetcher: () => getAgenciesWithCoverage(),
    setData: (data) => setAgencies(data as Record<string, unknown>[]),
    setLoading: setIsLoadingAgencies,
    toastErrorTitle: 'Error Loading Agencies',
    toastErrorMessage: 'Could not load transit agencies.',
      });

  const performSearch = useToastingDataFetcher({
    fetcher: async () => {
      if (!searchQuery.trim()) return { routes: [], stops: [] };
      if (searchType === 'routes') {
        const routes = await searchRoutesByName(searchQuery, 15);
        return { routes, stops: [] };
      } else {
        const stops = await searchStops(searchQuery, 15);
        return { routes: [], stops };
      }
    },
    setData: setSearchResults,
    setLoading: setIsLoadingSearch,
    toastErrorTitle: 'Search Error',
    toastErrorMessage: 'Could not perform search.',
      });

  // Initialize data
  useEffect(() => {
    if (enabledModes.has('popular')) loadPopularRoutes();
    if (enabledModes.has('agencies')) loadAgencies();
  }, [loadPopularRoutes, loadAgencies, enabledModes]);

  useEffect(() => {
    if (currentLocation && enabledModes.has('nearby')) {
      loadNearbyTransit();
    }
  }, [currentLocation, loadNearbyTransit, enabledModes]);

  // Search debounce
  useEffect(() => {
    if (!enabledModes.has('search')) return;
    
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, performSearch, enabledModes]);

  // Load favorites from localStorage
  useEffect(() => {
    if (enabledModes.has('favorites')) {
      const savedFavorites = localStorage.getItem('slymaps-favorites');
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites);
          setFavorites(parsed);
        } catch (error) {
          console.error('Failed to parse favorites from localStorage', error);
          toast({
            title: "Could not load favorites",
            description: "Your saved favorites seem to be corrupted. They have been cleared.",
            variant: "destructive"
          });
          localStorage.removeItem('slymaps-favorites');
        }
      }
    }
  }, [enabledModes, toast]);

  const toggleMode = (mode: BrowseMode) => {
    const newModes = new Set(enabledModes);
    if (newModes.has(mode)) {
      newModes.delete(mode);
      if (activeMode === mode) {
        setActiveMode(Array.from(newModes)[0] || 'popular');
      }
    } else {
      newModes.add(mode);
    }
    setEnabledModes(newModes);
  };

  const handleRouteClick = (route: ObaRouteSearchResult) => {
    onRouteSelect(route.id);
  };

  const handleStopClick = (stop: ObaStopSearchResult) => {
    onStopSelect(stop.id, stop.name, {
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
    onFlyTo({
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
  };

  const toggleFavorite = (type: 'route' | 'stop', id: string) => {
    const newFavorites = { ...favorites };
    const key = type === 'route' ? 'routes' : 'stops';
    
    if (newFavorites[key].includes(id)) {
      newFavorites[key] = newFavorites[key].filter(fav => fav !== id);
    } else {
      newFavorites[key].push(id);
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('slymaps-favorites', JSON.stringify(newFavorites));
  };

  const getRouteTypeDisplay = (type?: number) => {
    switch (type) {
      case 3: return 'Bus';
      case 1: return 'Light Rail';
      case 2: return 'Rail';
      case 4: return 'Ferry';
      case 7: return 'Funicular';
      default: return 'Transit';
    }
  };

  const availableModes = [
    { id: 'popular', label: 'Popular Routes', icon: 'TrendingUp', requiresLocation: false },
    { id: 'nearby', label: 'Nearby Transit', icon: 'MapPin', requiresLocation: true },
    { id: 'search', label: 'Search', icon: 'Search', requiresLocation: false },
    { id: 'agencies', label: 'By Agency', icon: 'Building2', requiresLocation: false },
    { id: 'favorites', label: 'Favorites', icon: 'Heart', requiresLocation: false },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Mode Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icons.Settings className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Browse Modes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 gap-2">
            {availableModes.map((mode) => {
              const IconComponent = Icons[mode.icon as keyof typeof Icons] || Icons.Circle;
              const isDisabled = mode.requiresLocation && !currentLocation;
              
              return (
                <div key={mode.id} className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{mode.label}</span>
                    {isDisabled && (
                      <Badge variant="outline" className="text-xs">Needs Location</Badge>
                    )}
                  </div>
                  <Switch
                    checked={enabledModes.has(mode.id as BrowseMode)}
                    onCheckedChange={() => toggleMode(mode.id as BrowseMode)}
                    disabled={isDisabled}
                    className="flex-shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Modes Content */}
      {enabledModes.size > 0 && (
        <div>
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as BrowseMode)} className="w-full">
            <TabsList className="grid w-full"
              style={{ 
                gridTemplateColumns: `repeat(${Math.min(enabledModes.size, 4)}, minmax(0, 1fr))` 
              }}
            >
              {Array.from(enabledModes).slice(0, 4).map((mode) => {
                const modeConfig = availableModes.find(m => m.id === mode);
                const IconComponent = Icons[modeConfig?.icon as keyof typeof Icons] || Icons.Circle;
                
                return (
                  <TabsTrigger key={mode} value={mode} className="text-xs min-w-0">
                    <IconComponent className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{modeConfig?.label.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Popular Routes */}
            {enabledModes.has('popular') && (
              <TabsContent value="popular" className="space-y-3 mt-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Discover popular transit routes
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadPopularRoutes}
                    disabled={isLoadingPopular}
                    className="h-6 w-6 p-0"
                  >
                    <Icons.Refresh className={`h-3 w-3 ${isLoadingPopular ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {isLoadingPopular ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-6 w-12 rounded" />
                        <Skeleton className="h-4 flex-1 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] pr-2">
                    <div className="space-y-1.5">
                      {popularRoutes.map((route) => (
                        <Button
                          key={route.id}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-2"
                          onClick={() => handleRouteClick(route)}
                          disabled={isLoadingRoute}
                        >
                          <div className="flex items-start gap-1 w-full min-w-0 overflow-hidden pt-1">
                            <Badge 
                              variant="secondary" 
                              className="font-bold text-xs px-1 py-0.5 min-w-[1.5rem] max-w-[2rem] text-center flex-shrink-0 truncate mt-0.5"
                              style={route.color ? { 
                                backgroundColor: `#${route.color}`, 
                                color: route.textColor ? `#${route.textColor}` : '#FFFFFF' 
                              } : {}}
                              title={route.shortName}
                            >
                              {route.shortName}
                            </Badge>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm leading-tight break-words">
                                {route.longName || route.description || `Route ${route.shortName}`}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {getRouteTypeDisplay(route.type)}
                              </p>
                            </div>
                            <div
                              className="h-5 w-5 p-0 flex items-center justify-center rounded hover:bg-accent cursor-pointer flex-shrink-0 mt-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite('route', route.id);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleFavorite('route', route.id);
                                }
                              }}
                              title={favorites.routes.includes(route.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Icons.Heart 
                                className={`h-3 w-3 ${favorites.routes.includes(route.id) ? 'fill-red-500 text-red-500' : 'hover:text-red-400'}`} 
                              />
                            </div>
                            <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            )}

            {/* Nearby Transit */}
            {enabledModes.has('nearby') && (
              <TabsContent value="nearby" className="space-y-3 mt-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Transit near your location
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadNearbyTransit}
                    disabled={isLoadingNearby || !currentLocation}
                    className="h-6 w-6 p-0"
                  >
                    <Icons.Refresh className={`h-3 w-3 ${isLoadingNearby ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {!currentLocation ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <Icons.MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Location access needed</p>
                    <p className="text-xs">Enable location to see nearby transit</p>
                  </div>
                ) : isLoadingNearby ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-6 w-12 rounded" />
                        <Skeleton className="h-4 flex-1 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] pr-2">
                    <div className="space-y-3">
                      {nearbyTransit?.routes && nearbyTransit.routes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Nearby Routes</h4>
                          <div className="space-y-1">
                            {nearbyTransit.routes.map((route) => (
                              <Button
                                key={route.id}
                                variant="ghost"
                                className="w-full justify-start text-left h-auto py-1.5 px-2"
                                onClick={() => handleRouteClick(route)}
                                disabled={isLoadingRoute}
                              >
                                <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                  <Badge 
                                    variant="secondary" 
                                    className="font-bold text-xs px-1 py-0.5 min-w-[1.5rem] max-w-[2rem] text-center flex-shrink-0 truncate"
                                    style={route.color ? { 
                                      backgroundColor: `#${route.color}`, 
                                      color: route.textColor ? `#${route.textColor}` : '#FFFFFF' 
                                    } : {}}
                                    title={route.shortName}
                                  >
                                    {route.shortName}
                                  </Badge>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-sm leading-tight break-words">
                                      {route.longName || route.description || `Route ${route.shortName}`}
                                    </p>
                                  </div>
                                  <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {nearbyTransit?.stops && nearbyTransit.stops.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Nearby Stops</h4>
                          <div className="space-y-1">
                            {nearbyTransit.stops.slice(0, 8).map((stop) => (
                              <Button
                                key={stop.id}
                                variant="ghost"
                                className="w-full justify-start text-left h-auto py-1.5 px-2"
                                onClick={() => handleStopClick(stop)}
                              >
                                <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                  <Icons.Bus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-sm leading-tight break-words">{stop.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {stop.code} • {stop.routeIds.length} routes
                                    </p>
                                  </div>
                                  <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!nearbyTransit?.routes?.length && !nearbyTransit?.stops?.length) && (
                        <div className="text-center text-sm text-muted-foreground py-4">
                          <Icons.Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No nearby transit found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            )}

            {/* Search */}
            {enabledModes.has('search') && (
              <TabsContent value="search" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Search ${searchType}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchType(searchType === 'routes' ? 'stops' : 'routes')}
                      className="flex-shrink-0 w-10 h-10"
                    >
                      {searchType === 'routes' ? (
                        <Icons.Route className="h-4 w-4" />
                      ) : (
                        <Icons.Bus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Searching for {searchType} • Click icon to switch
                  </p>
                </div>

                {isLoadingSearch ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-6 w-12 rounded" />
                        <Skeleton className="h-4 flex-1 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] pr-2">
                    <div className="space-y-1.5">
                      {searchType === 'routes' 
                        ? searchResults.routes.map((route) => (
                            <Button
                              key={route.id}
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-2 px-2"
                              onClick={() => handleRouteClick(route)}
                              disabled={isLoadingRoute}
                            >
                                                                                           <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                <Badge 
                                  variant="secondary" 
                                  className="font-bold text-xs px-1 py-0.5 min-w-[1.5rem] max-w-[2rem] text-center flex-shrink-0 truncate"
                                  style={route.color ? { 
                                    backgroundColor: `#${route.color}`, 
                                    color: route.textColor ? `#${route.textColor}` : '#FFFFFF' 
                                  } : {}}
                                  title={route.shortName}
                                >
                                  {route.shortName}
                                </Badge>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm leading-tight break-words">
                                    {route.longName || route.description || `Route ${route.shortName}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {getRouteTypeDisplay(route.type)}
                                  </p>
                                </div>
                               <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Button>
                          ))
                        : searchResults.stops.map((stop) => (
                            <Button
                              key={stop.id}
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-2 px-2"
                              onClick={() => handleStopClick(stop)}
                            >
                              <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                <Icons.Bus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm leading-tight break-words">{stop.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {stop.code} • {stop.routeIds.length} routes
                                  </p>
                                </div>
                                <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Button>
                          ))
                      }
                      
                      {searchQuery && !isLoadingSearch && 
                       ((searchType === 'routes' && searchResults.routes.length === 0) ||
                        (searchType === 'stops' && searchResults.stops.length === 0)) && (
                        <div className="text-center text-sm text-muted-foreground py-4">
                          <Icons.Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No {searchType} found</p>
                          <p className="text-xs">Try a different search term</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            )}

            {/* Agencies */}
            {enabledModes.has('agencies') && (
              <TabsContent value="agencies" className="space-y-3 mt-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Browse by transit agency
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAgencies}
                    disabled={isLoadingAgencies}
                    className="h-6 w-6 p-0"
                  >
                    <Icons.Refresh className={`h-3 w-3 ${isLoadingAgencies ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {isLoadingAgencies ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] pr-2">
                    <div className="space-y-1.5">
                      {agencies.map((agency) => (
                        <Button
                          key={agency.id as string}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-2"
                          onClick={() => {
                            // Navigate to agency-specific view
                            toast({
                              title: "Agency Selected",
                              description: `Viewing routes for ${agency.name}`,
                            });
                          }}
                        >
                          <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                            <Icons.Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium leading-tight break-words">{agency.name as string}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {agency.url ? 'View agency info' : 'Transit agency'}
                              </p>
                            </div>
                            <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            )}

            {/* Favorites */}
            {enabledModes.has('favorites') && (
              <TabsContent value="favorites" className="space-y-3 mt-3">
                <p className="text-sm text-muted-foreground">
                  Your saved routes and stops
                </p>

                <ScrollArea className="h-[200px] pr-2">
                  <div className="space-y-3">
                    {favorites.routes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Favorite Routes</h4>
                        <div className="space-y-1">
                          {favorites.routes.map((routeId) => (
                            <Button
                              key={routeId}
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-1.5 px-2"
                              onClick={() => onRouteSelect(routeId)}
                              disabled={isLoadingRoute}
                            >
                              <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                <Icons.Heart className="h-4 w-4 text-red-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm truncate">Route {routeId.split('_')[1] || routeId}</p>
                                </div>
                                <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {favorites.stops.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Favorite Stops</h4>
                        <div className="space-y-1">
                          {favorites.stops.map((stopId) => (
                            <Button
                              key={stopId}
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-1.5 px-2"
                              onClick={() => {
                                // Would need to fetch stop details to get coordinates
                                toast({
                                  title: "Favorite Stop",
                                  description: `Selected stop ${stopId}`,
                                });
                              }}
                            >
                              <div className="flex items-center gap-1 w-full min-w-0 overflow-hidden">
                                <Icons.Heart className="h-4 w-4 text-red-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <p className="text-sm truncate">Stop {stopId}</p>
                                </div>
                                <Icons.ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {favorites.routes.length === 0 && favorites.stops.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        <Icons.Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No favorites yet</p>
                        <p className="text-xs">Tap the heart icon on routes to save them</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {enabledModes.size === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          <Icons.Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Enable browse modes above</p>
          <p className="text-xs">Choose how you want to explore transit</p>
        </div>
      )}
    </div>
  );
} 