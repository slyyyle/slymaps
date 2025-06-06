"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { osmService, type OSMPoiData } from '@/services/osm-service';

export default function TestOSMPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OSMPoiData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Test coordinates (San Francisco)
  const testCoordinates = {
    lat: 37.7749,
    lon: -122.4194
  };

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log('🧪 Testing OSM service...');
      const pois = await osmService.fetchPOIData(
        testCoordinates.lat, 
        testCoordinates.lon, 
        200
      );
      
      setResults(pois);
      console.log(`✅ Found ${pois.length} POIs`);
    } catch (err) {
      console.error('❌ Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🗺️ OpenStreetMap Service Test</CardTitle>
          <p className="text-muted-foreground">
            Testing our OSM Overpass API integration to fetch real POI data
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={runTest} disabled={loading}>
              {loading ? '🔄 Fetching...' : '🚀 Test OSM Service'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Test location: San Francisco ({testCoordinates.lat}, {testCoordinates.lon})
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">❌ Error: {error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                ✅ Found {results.length} POIs:
              </h3>
              <div className="grid gap-3">
                {results.map((poi, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{poi.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {poi.category} • {poi.subclass}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {poi.address}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{poi.coordinates.lat.toFixed(4)}, {poi.coordinates.lon.toFixed(4)}</div>
                          {poi.phone && <div>📞 {poi.phone}</div>}
                          {poi.website && <div>🌐 <a href={poi.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">Website</a></div>}
                          {poi.opening_hours && <div>🕐 {poi.opening_hours}</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              Click "Test OSM Service" to fetch real POI data from OpenStreetMap
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 