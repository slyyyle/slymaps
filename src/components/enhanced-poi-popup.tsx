"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { osmService, type OSMPoiData } from '@/services/osm-service';
import { openingHoursParser, type ParsedHours } from '@/services/opening-hours-parser';

interface MapboxPOI {
  id: string;
  name: string;
  category: string;
  subclass?: string;
  longitude: number;
  latitude: number;
  properties: Record<string, string | number | boolean | null>;
}

interface PoiData {
  // Combined OSM + Future Enhanced API response
  place_id?: string;
  
  // OSM Data (real)
  osm_data?: OSMPoiData;
  
  // Enhanced data (future Foursquare API)
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

interface EnhancedPoiPopupProps {
  poi: MapboxPOI;
  onClose: () => void;
  onDirections: (lat: number, lng: number) => void;
  onFlyTo: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
  currentLightPreset?: 'day' | 'dusk' | 'dawn' | 'night';
}

const POI_CATEGORY_ICONS = {
  // Food & Drink
  restaurant: 'UtensilsCrossed',
  cafe: 'Coffee',
  bar: 'Wine',
  fast_food: 'Zap',
  food_court: 'UtensilsCrossed',
  
  // Shopping
  store: 'Store',
  shopping_mall: 'Building2',
  supermarket: 'ShoppingCart',
  pharmacy: 'Pill',
  
  // Services
  bank: 'Building2',
  atm: 'CreditCard',
  gas_station: 'Fuel',
  car_repair: 'Wrench',
  hospital: 'Hospital',
  
  // Entertainment
  cinema: 'Film',
  museum: 'Building',
  park: 'Trees',
  gym: 'Dumbbell',
  
  // Transportation
  subway_station: 'Train',
  bus_station: 'Bus',
  parking: 'Driving',
  
  // Lodging
  hotel: 'Building',
  
  // Default
  default: 'MapPin'
} as const;

const getPOIIcon = (category: string, subclass?: string) => {
  const key = (subclass || category) as keyof typeof POI_CATEGORY_ICONS;
  return POI_CATEGORY_ICONS[key] || POI_CATEGORY_ICONS.default;
};

const getPriceLevel = (level?: number) => {
  if (!level) return null;
  return '💰'.repeat(level);
};

// 🌅 BEAUTIFUL GRADIENT BACKGROUNDS BASED ON LIGHTING PRESET
const getGradientBackground = (preset: 'day' | 'dusk' | 'dawn' | 'night' = 'day') => {
  switch (preset) {
    case 'day':
      return 'bg-gradient-to-br from-blue-300 via-orange-200 to-yellow-100';
    case 'dusk':
      return 'bg-gradient-to-br from-orange-300 via-purple-200 to-blue-300';
    case 'dawn':
      return 'bg-gradient-to-br from-pink-300 via-rose-200 to-orange-100';
    case 'night':
      return 'bg-gradient-to-br from-slate-900 via-blue-950 to-gray-700';
    default:
      return 'bg-gradient-to-br from-blue-300 via-orange-200 to-yellow-100';
  }
};

export function EnhancedPoiPopup({ poi, onClose, onDirections, onFlyTo, currentLightPreset = 'day' }: EnhancedPoiPopupProps) {
  const [enrichedData, setEnrichedData] = useState<PoiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [parsedHours, setParsedHours] = useState<ParsedHours | null>(null);

  // Fetch real OSM data + prepare for future enhanced data
  useEffect(() => {
    const fetchEnrichedData = async () => {
      if (!poi.name || poi.name === 'Unknown POI') return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 🚀 PHASE 1: Fetch real OSM data
        console.log(`🗺️ Fetching OSM data for: ${poi.name}`);
        const osmData = await osmService.findMatchingPOI(
          poi.name, 
          poi.latitude, 
          poi.longitude
        );

        // Parse opening hours for beautiful display
        let hoursData: ParsedHours | null = null;
        if (osmData?.opening_hours) {
          hoursData = openingHoursParser.parseOpeningHours(osmData.opening_hours);
          setParsedHours(hoursData);
        }

        // Combine OSM data with basic POI info
        const enhancedData: PoiData = {
          place_id: `osm_${poi.id}`,
          osm_data: osmData || undefined,
          
          // Use OSM data when available
          formatted_address: osmData?.address || `${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}`,
          formatted_phone_number: osmData?.phone,
          website: osmData?.website,
          
          // Use parsed hours for open/closed status
          opening_hours: hoursData ? {
            open_now: hoursData.hasData ? openingHoursParser.getCurrentDayStatus(hoursData).isOpenNow : undefined,
            weekday_text: hoursData.schedule.map(day => `${day.fullDay}: ${day.hours}`)
          } : undefined,
          
          // 🔮 PHASE 2: Enhanced data placeholder (future Foursquare API)
          // These will be populated when we add Foursquare integration
          rating: undefined,
          user_ratings_total: undefined,
          price_level: undefined,
          reviews: undefined
        };
        
        setEnrichedData(enhancedData);
        console.log(`✅ OSM data loaded for: ${poi.name}`, osmData ? '(found match)' : '(no match)');
      } catch (fetchError) {
        console.error('Failed to fetch OSM data:', fetchError);
        setError('Failed to load additional information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnrichedData();
  }, [poi]);

  const IconComponent = Icons[getPOIIcon(poi.category, poi.subclass)] || Icons.MapPin;
  const gradientClass = getGradientBackground(currentLightPreset);
  const isNightMode = currentLightPreset === 'night';

  if (loading) {
    return (
      <Card className={`border-none shadow-lg w-full max-w-lg ${gradientClass}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${isNightMode ? 'bg-white/20' : 'bg-primary/10'} rounded-lg`}>
                <IconComponent className={`h-6 w-6 ${isNightMode ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <CardTitle className={`text-lg font-bold leading-tight ${isNightMode ? 'text-white' : ''}`}>
                  {poi.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200 text-gray-700 rounded-none px-2.5 py-0.5">
                    <div className="flex items-center gap-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </Badge>
                </div>
                {poi.properties?.brand && (
                  <CardDescription className={`text-xs ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'} mt-1`}>
                    {poi.properties.brand}
                  </CardDescription>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className={`h-8 w-8 p-0 ${isNightMode ? 'text-white hover:bg-white/20' : ''}`}
            >
              <Icons.X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <Tabs value="" className="w-full">
            <TabsList className={`grid w-full grid-cols-3 ${isNightMode ? 'bg-white/20' : ''}`}>
              <TabsTrigger 
                value="overview" 
                disabled 
                className={`text-xs opacity-50 cursor-not-allowed ${isNightMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                disabled 
                className={`text-xs opacity-50 cursor-not-allowed ${isNightMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                disabled 
                className={`text-xs opacity-50 cursor-not-allowed ${isNightMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Reviews
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  </div>
                  <span className={isNightMode ? 'text-gray-300' : ''}>Loading...</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-none shadow-lg w-full max-w-lg ${gradientClass}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isNightMode ? 'bg-white/20' : 'bg-primary/10'} rounded-lg`}>
              <IconComponent className={`h-6 w-6 ${isNightMode ? 'text-white' : 'text-primary'}`} />
            </div>
            <div>
              <CardTitle className={`text-lg font-bold leading-tight ${isNightMode ? 'text-white' : ''}`}>
                {poi.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200 text-gray-700 capitalize rounded-none px-2.5 py-0.5">
                  {poi.subclass || poi.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs border px-2.5 py-0.5 ${
                    enrichedData?.opening_hours?.open_now === true
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                      : 'border-rose-300 bg-rose-50 text-rose-700'
                  }`}
                >
                  {enrichedData?.opening_hours?.open_now === true ? "Open" : "Closed"}
                </Badge>
              </div>
              {poi.properties?.brand && (
                <CardDescription className={`text-xs ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'} mt-1`}>
                  {poi.properties.brand}
                </CardDescription>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className={`h-8 w-8 p-0 ${isNightMode ? 'text-white hover:bg-white/20' : ''}`}
          >
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Info Bar */}
        {(enrichedData?.rating || enrichedData?.price_level) && (
          <div className="flex items-center gap-2 mt-2">
            {enrichedData?.rating && (
              <div className="flex items-center gap-1">
                <Icons.Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className={`text-sm font-medium ${isNightMode ? 'text-white' : ''}`}>
                  {enrichedData.rating.toFixed(1)}
                </span>
                <span className={`text-xs ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`}>
                  ({enrichedData.user_ratings_total})
                </span>
              </div>
            )}
            {enrichedData?.price_level && (
              <Badge variant="outline" className="text-xs">
                {getPriceLevel(enrichedData.price_level)}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-3 ${isNightMode ? 'bg-white/20' : ''}`}>
            <TabsTrigger value="overview" className={`text-xs ${isNightMode ? 'data-[state=active]:bg-white/30 data-[state=active]:text-white text-gray-300' : 'text-gray-600 data-[state=active]:text-foreground'}`}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="details" className={`text-xs ${isNightMode ? 'data-[state=active]:bg-white/30 data-[state=active]:text-white text-gray-300' : 'text-gray-600 data-[state=active]:text-foreground'}`}>
              Details
            </TabsTrigger>
            <TabsTrigger value="reviews" className={`text-xs ${isNightMode ? 'data-[state=active]:bg-white/30 data-[state=active]:text-white text-gray-300' : 'text-gray-600 data-[state=active]:text-foreground'}`}>
              Reviews
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-3">
            {/* Contact Info */}
            {(enrichedData?.formatted_phone_number || enrichedData?.website) && (
              <div className="space-y-2">
                {enrichedData?.formatted_phone_number && (
                  <div className="flex items-center gap-2">
                    <Icons.Phone className={`h-4 w-4 ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`} />
                    <a 
                      href={`tel:${enrichedData.formatted_phone_number}`}
                      className={`text-sm ${isNightMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:underline'}`}
                    >
                      {enrichedData.formatted_phone_number}
                    </a>
                  </div>
                )}
                {enrichedData?.website && (
                  <div className="flex items-center gap-2">
                    <Icons.Globe className={`h-4 w-4 ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`} />
                    <a 
                      href={enrichedData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm ${isNightMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:underline'} truncate`}
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Address */}
            {enrichedData?.formatted_address && (
              <div className="flex items-start gap-2">
                <Icons.MapPin className={`h-4 w-4 ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'} mt-0.5`} />
                <span className={`text-sm ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'} leading-relaxed`}>
                  {enrichedData.formatted_address}
                </span>
              </div>
            )}
            
            <Separator className={isNightMode ? 'bg-white/20' : ''} />
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="default"
                variant="outline"
                onClick={() => onDirections(poi.latitude, poi.longitude)}
                className={`w-full ${isNightMode ? 'border-white/30 text-black bg-white/90 hover:bg-white/80' : ''}`}
              >
                <Icons.Navigation className="h-4 w-4 mr-2" />
                Directions
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={() => onFlyTo({ latitude: poi.latitude, longitude: poi.longitude }, 18)}
                className={`w-full ${isNightMode ? 'border-white/30 text-black bg-white/90 hover:bg-white/80' : ''}`}
              >
                <Icons.ZoomIn className="h-4 w-4 mr-2" />
                Zoom In
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="mt-4 space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : parsedHours?.hasData ? (
              <div>
                <h4 className={`text-sm font-medium mb-3 ${isNightMode ? 'text-white' : ''}`}>
                  Opening Hours
                </h4>
                
                {/* Beautiful Mini Table */}
                <div className={`border rounded-lg overflow-hidden ${isNightMode ? 'border-white/30' : ''}`}>
                  <div className={`divide-y ${isNightMode ? 'divide-white/20' : ''}`}>
                    {parsedHours.schedule.map((dayInfo, index) => {
                      const isToday = new Date().getDay() === (index + 1) % 7;
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center px-3 py-2 text-xs ${
                            isToday 
                              ? isNightMode 
                                ? 'bg-white/10 border-l-2 border-l-blue-400' 
                                : 'bg-primary/5 border-l-2 border-l-primary'
                              : ''
                          }`}
                        >
                          <span className={`font-medium ${
                            isToday 
                              ? isNightMode 
                                ? 'text-blue-200' 
                                : 'text-blue-700'
                              : isNightMode 
                                ? 'text-white' 
                                : 'text-foreground'
                          }`}>
                            {dayInfo.day}
                            {isToday && (
                              <span className={`ml-1 ${isNightMode ? 'text-blue-200' : 'text-blue-700'}`}>
                                (Today)
                              </span>
                            )}
                          </span>
                          <span className={`${
                            dayInfo.isClosed 
                              ? 'text-rose-500' 
                              : dayInfo.isOpen 
                                ? 'text-emerald-600' 
                                : isNightMode 
                                  ? 'text-gray-300' 
                                  : 'text-muted-foreground'
                          }`}>
                            {dayInfo.hours}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes if any */}
                {parsedHours.notes && (
                  <div className={`mt-2 text-xs p-2 rounded ${
                    isNightMode 
                      ? 'text-yellow-300 bg-yellow-900/30' 
                      : 'text-amber-600 bg-amber-50'
                  }`}>
                    ℹ️ {parsedHours.notes}
                  </div>
                )}

                {/* Raw format for debugging */}
                <details className="mt-2">
                  <summary className={`text-xs cursor-pointer ${
                    isNightMode 
                      ? 'text-gray-300 hover:text-white' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                    Raw format
                  </summary>
                  <div className={`mt-1 text-xs font-mono p-2 rounded ${
                    isNightMode 
                      ? 'text-gray-300 bg-white/10' 
                      : 'text-muted-foreground bg-muted'
                  }`}>
                    {parsedHours.rawString}
                  </div>
                </details>
              </div>
            ) : (
              <div className="space-y-2">
                <p className={`text-sm ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`}>
                  Hours information not available
                </p>
                {!enrichedData?.osm_data && (
                  <div className={`text-xs p-2 rounded ${
                    isNightMode 
                      ? 'text-blue-300 bg-blue-900/30' 
                      : 'text-blue-600 bg-blue-50'
                  }`}>
                    💡 Enhanced data (hours, ratings, reviews) coming in Phase 2!
                  </div>
                )}
              </div>
            )}
            
            <Separator className={isNightMode ? 'bg-white/20' : ''} />
            
            {/* Coordinates */}
            <div className="flex items-center gap-2">
              <Icons.MapPin className={`h-4 w-4 ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`}>
                {poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}
              </span>
            </div>
            
            {/* Data Source Indicator */}
            {enrichedData?.osm_data && (
              <div className="text-xs text-emerald-500">
                ✅ Enhanced with OpenStreetMap data
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : enrichedData?.reviews ? (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {enrichedData.reviews.map((review, index) => (
                    <div key={index} className={`border rounded-lg p-3 ${isNightMode ? 'border-white/30' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isNightMode ? 'text-white' : ''}`}>
                          {review.author_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Icons.Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className={`text-sm font-medium ${isNightMode ? 'text-white' : ''}`}>
                            {review.rating}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${
                        isNightMode ? 'text-gray-300' : 'text-muted-foreground'
                      }`}>
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Icons.MessageSquare className={`h-12 w-12 mx-auto ${
                  isNightMode ? 'text-gray-300' : 'text-muted-foreground'
                }`} />
                <div>
                  <p className={`text-sm mb-2 ${isNightMode ? 'text-gray-300' : 'text-muted-foreground'}`}>
                    No reviews available yet
                  </p>
                  <div className={`text-xs p-3 rounded ${
                    isNightMode 
                      ? 'text-blue-300 bg-blue-900/30' 
                      : 'text-blue-600 bg-blue-50'
                  }`}>
                    🚀 <strong>Coming in Phase 2:</strong><br/>
                    • Real user reviews from Foursquare<br/>
                    • Star ratings and review counts<br/>
                    • Photos and recommendations
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}