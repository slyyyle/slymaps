"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { osmService, type OSMPoiData } from '@/services/osm-service';
import { openingHoursParser } from '@/services/opening-hours-parser';

// Mock Foursquare API response for testing
interface MockFoursquareData {
  fsq_id: string;
  name: string;
  rating: number;
  rating_count: number;
  price: number;
  hours: {
    open_now: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  photos: Array<{ url: string }>;
  categories: Array<{ name: string; icon: string }>;
  tips: Array<{
    text: string;
    user: { name: string };
    created_at: string;
  }>;
}

// Place type styling configuration
const PLACE_TYPE_STYLES = {
  restaurant: {
    primary: 'bg-orange-500',
    secondary: 'bg-orange-50 text-orange-700 border-orange-200',
    accent: 'text-orange-600',
    icon: '🍽️'
  },
  cafe: {
    primary: 'bg-amber-500',
    secondary: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
    icon: '☕'
  },
  bar: {
    primary: 'bg-purple-500',
    secondary: 'bg-purple-50 text-purple-700 border-purple-200',
    accent: 'text-purple-600',
    icon: '🍺'
  },
  store: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-50 text-blue-700 border-blue-200',
    accent: 'text-blue-600',
    icon: '🛍️'
  },
  hospital: {
    primary: 'bg-red-500',
    secondary: 'bg-red-50 text-red-700 border-red-200',
    accent: 'text-red-600',
    icon: '🏥'
  },
  bank: {
    primary: 'bg-green-500',
    secondary: 'bg-green-50 text-green-700 border-green-200',
    accent: 'text-green-600',
    icon: '🏦'
  },
  default: {
    primary: 'bg-gray-500',
    secondary: 'bg-gray-50 text-gray-700 border-gray-200',
    accent: 'text-gray-600',
    icon: '📍'
  }
};

export default function TestDataFlowPage() {
  const [testResults, setTestResults] = useState<{
    osm: OSMPoiData | null;
    foursquare: MockFoursquareData | null;
    enhanced: boolean;
    apiCallsUsed: number;
  } | null>(null);
  
  const [apiStats, setApiStats] = useState({
    osmCalls: 0,
    foursquareCalls: 0,
    foursquareQuota: 1000,
    fallbackMode: false
  });

  // Test coordinates for different POI types
  const testLocations = [
    { name: "Coffee Shop Test", lat: 37.7749, lon: -122.4194, expectedType: "cafe" },
    { name: "Restaurant Test", lat: 37.7849, lon: -122.4094, expectedType: "restaurant" },
    { name: "Bank Test", lat: 37.7649, lon: -122.4294, expectedType: "bank" },
    { name: "Hospital Test", lat: 37.7949, lon: -122.3994, expectedType: "hospital" }
  ];

  const getPlaceTypeStyle = (category: string) => {
    return PLACE_TYPE_STYLES[category as keyof typeof PLACE_TYPE_STYLES] || PLACE_TYPE_STYLES.default;
  };

  const simulateFoursquareCall = async (osmData: OSMPoiData): Promise<MockFoursquareData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      fsq_id: `fsq_${Date.now()}`,
      name: osmData.name || "Unknown",
      rating: 3.5 + Math.random() * 1.5, // 3.5-5.0
      rating_count: Math.floor(Math.random() * 500) + 50,
      price: Math.floor(Math.random() * 4) + 1,
      hours: {
        open_now: Math.random() > 0.3,
        periods: [
          { open: { day: 1, time: "0800" }, close: { day: 1, time: "2200" } }
        ]
      },
      photos: [
        { url: "https://via.placeholder.com/400x300?text=Photo+1" },
        { url: "https://via.placeholder.com/400x300?text=Photo+2" }
      ],
      categories: [{ name: osmData.category || "Place", icon: "🏪" }],
      tips: [
        {
          text: "Great place with excellent service!",
          user: { name: "FoodieExplorer" },
          created_at: "2024-01-15T10:30:00Z"
        },
        {
          text: "Highly recommend the daily specials.",
          user: { name: "LocalGuide" },
          created_at: "2024-01-10T14:20:00Z"
        }
      ]
    };
  };

  const testDataFlow = async (location: typeof testLocations[0]) => {
    setTestResults(null);
    
    try {
      // Step 1: Always fetch OSM data (free)
      console.log(`🗺️ Step 1: Fetching OSM data for ${location.name}`);
      const osmData = await osmService.findMatchingPOI(
        location.name,
        location.lat,
        location.lon
      );
      
      setApiStats(prev => ({ ...prev, osmCalls: prev.osmCalls + 1 }));

      if (!osmData) {
        setTestResults({
          osm: null,
          foursquare: null,
          enhanced: false,
          apiCallsUsed: 0
        });
        return;
      }

      // Step 2: Check if we should enhance with Foursquare
      const shouldEnhance = apiStats.foursquareCalls < apiStats.foursquareQuota && !apiStats.fallbackMode;
      
      if (shouldEnhance) {
        console.log(`🚀 Step 2: Enhancing with Foursquare API`);
        const foursquareData = await simulateFoursquareCall(osmData);
        
        setApiStats(prev => ({ 
          ...prev, 
          foursquareCalls: prev.foursquareCalls + 1,
          fallbackMode: prev.foursquareCalls + 1 >= prev.foursquareQuota
        }));

        setTestResults({
          osm: osmData,
          foursquare: foursquareData,
          enhanced: true,
          apiCallsUsed: 1
        });
      } else {
        console.log(`⚠️ Step 2: Using OSM data only (quota exceeded or fallback mode)`);
        setTestResults({
          osm: osmData,
          foursquare: null,
          enhanced: false,
          apiCallsUsed: 0
        });
      }

    } catch (error) {
      console.error('Data flow test failed:', error);
    }
  };

  const resetQuota = () => {
    setApiStats({
      osmCalls: 0,
      foursquareCalls: 0,
      foursquareQuota: 1000,
      fallbackMode: false
    });
  };

  const simulateQuotaExhaustion = () => {
    setApiStats(prev => ({
      ...prev,
      foursquareCalls: 990,
      fallbackMode: false
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔄 Data Flow & Enhancement Strategy Test</CardTitle>
          <p className="text-muted-foreground">
            Test how OSM + Foursquare integration works with conditional coloring and quota management
          </p>
        </CardHeader>
        <CardContent>
          {/* API Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-green-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{apiStats.osmCalls}</div>
                  <div className="text-sm text-muted-foreground">OSM Calls</div>
                  <div className="text-xs text-green-600">Always Free</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {apiStats.foursquareCalls}/{apiStats.foursquareQuota}
                  </div>
                  <div className="text-sm text-muted-foreground">Foursquare Quota</div>
                  <div className={`text-xs ${apiStats.fallbackMode ? 'text-red-600' : 'text-blue-600'}`}>
                    {apiStats.fallbackMode ? 'Fallback Mode' : 'Active'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((apiStats.foursquareCalls / apiStats.foursquareQuota) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Quota Used</div>
                  <div className="text-xs text-purple-600">Daily Limit</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardContent className="p-4 space-y-2">
                <Button size="sm" onClick={resetQuota} className="w-full">
                  Reset Quota
                </Button>
                <Button size="sm" variant="outline" onClick={simulateQuotaExhaustion} className="w-full">
                  Test Quota Limit
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Test Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {testLocations.map((location, index) => {
              const style = getPlaceTypeStyle(location.expectedType);
              return (
                <Button
                  key={index}
                  onClick={() => testDataFlow(location)}
                  className={`h-auto p-4 ${style.secondary} hover:${style.secondary} border`}
                  variant="outline"
                >
                  <div className="text-left w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{style.icon}</span>
                      <span className="font-medium">{location.name}</span>
                    </div>
                    <div className="text-xs opacity-75">
                      Expected: {location.expectedType} • {location.lat}, {location.lon}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Results */}
          {testResults && (
            <div className="space-y-6">
              <Separator />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OSM Data */}
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-2">
                      🗺️ OpenStreetMap Data
                      <Badge variant="outline" className="text-green-600">Always Available</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResults.osm ? (
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {testResults.osm.name}</div>
                        <div><strong>Category:</strong> {testResults.osm.category}</div>
                        <div><strong>Address:</strong> {testResults.osm.address}</div>
                        {testResults.osm.phone && <div><strong>Phone:</strong> {testResults.osm.phone}</div>}
                        {testResults.osm.website && <div><strong>Website:</strong> {testResults.osm.website}</div>}
                        {testResults.osm.opening_hours && (
                          <div><strong>Hours:</strong> {testResults.osm.opening_hours}</div>
                        )}
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                          ✅ Basic POI data always available from OSM
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No OSM data found</div>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Data */}
                <Card className={testResults.enhanced ? "border-blue-200" : "border-gray-200"}>
                  <CardHeader>
                    <CardTitle className={`${testResults.enhanced ? 'text-blue-700' : 'text-gray-700'} flex items-center gap-2`}>
                      🚀 Enhanced Data (Foursquare)
                      <Badge 
                        variant={testResults.enhanced ? "default" : "secondary"}
                        className={testResults.enhanced ? "bg-blue-100 text-blue-700" : ""}
                      >
                        {testResults.enhanced ? 'Active' : 'Fallback Mode'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResults.foursquare ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <strong>Rating:</strong> 
                          <span className="flex items-center gap-1">
                            {'⭐'.repeat(Math.floor(testResults.foursquare.rating))}
                            {testResults.foursquare.rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">({testResults.foursquare.rating_count})</span>
                        </div>
                        <div><strong>Price:</strong> {'💰'.repeat(testResults.foursquare.price)}</div>
                        <div><strong>Status:</strong> 
                                            <Badge 
                    variant="outline" 
                    className={`ml-2 border ${
                      testResults.foursquare.hours.open_now 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                        : 'border-rose-300 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {testResults.foursquare.hours.open_now ? "Open Now" : "Closed"}
                  </Badge>
                        </div>
                        <div><strong>Photos:</strong> {testResults.foursquare.photos.length} available</div>
                        <div><strong>Tips:</strong> {testResults.foursquare.tips.length} user reviews</div>
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                          🚀 Enhanced with ratings, reviews, photos, and real-time status
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground space-y-2">
                        <div>Enhanced data not available</div>
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          ⚠️ {apiStats.fallbackMode ? 'Daily quota exceeded' : 'API enhancement disabled'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Data Strategy Explanation */}
              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle className="text-purple-700">📊 Smart Enhancement Strategy</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <strong className="text-green-700">Step 1: OSM Foundation</strong>
                      <div className="text-green-600 mt-1">Always fetch basic POI data (name, location, basic hours)</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <strong className="text-blue-700">Step 2: Smart Enhancement</strong>
                      <div className="text-blue-600 mt-1">Add ratings, reviews, photos if quota available</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                      <strong className="text-purple-700">Step 3: Graceful Fallback</strong>
                      <div className="text-purple-600 mt-1">Still functional with OSM data when quota exceeded</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 