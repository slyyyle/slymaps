"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedPoiPopup } from '@/components/enhanced-poi-popup';

const mockPoi = {
  id: 'test-poi-1',
  name: 'Pike Place Market',
  category: 'shopping',
  subclass: 'market',
  longitude: -122.342834,
  latitude: 47.608013,
  properties: {
    brand: 'Historic Market',
    address: '85 Pike St, Seattle, WA 98101'
  }
};

export default function TestGradientsPage() {
  const [currentPreset, setCurrentPreset] = useState<'day' | 'dusk' | 'dawn' | 'night'>('day');
  const [showPopup, setShowPopup] = useState(true);

  const presets = [
    { value: 'day' as const, label: 'Day ☀️', description: 'Bright blue sky gradient' },
    { value: 'dusk' as const, label: 'Dusk 🌆', description: 'Warm orange sunset gradient' },
    { value: 'dawn' as const, label: 'Dawn 🌅', description: 'Soft pink sunrise gradient' },
    { value: 'night' as const, label: 'Night 🌙', description: 'Dark blue night gradient' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">🌅 POI Popup Gradient Backgrounds</CardTitle>
            <CardDescription>
              Test the beautiful time-based gradient backgrounds for POI popups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Controls */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Lighting Preset</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={currentPreset === preset.value ? "default" : "outline"}
                    onClick={() => setCurrentPreset(preset.value)}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Current Status */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                Current: {presets.find(p => p.value === currentPreset)?.label}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPopup(!showPopup)}
              >
                {showPopup ? 'Hide' : 'Show'} Popup
              </Button>
            </div>

            {/* Popup Demo */}
            {showPopup && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-white">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  POI Popup with {presets.find(p => p.value === currentPreset)?.label} Gradient
                </h3>
                <div className="flex justify-center">
                  <div className="relative">
                    <EnhancedPoiPopup
                      poi={mockPoi}
                      onClose={() => console.log('Close clicked')}
                      onDirections={(lat, lng) => console.log(`Directions to: ${lat}, ${lng}`)}
                      onFlyTo={(coords, zoom) => console.log(`Fly to: ${coords.latitude}, ${coords.longitude}, zoom: ${zoom}`)}
                      currentLightPreset={currentPreset}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Gradient Examples */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Gradient Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {presets.map((preset) => (
                  <div key={preset.value} className="space-y-2">
                    <div 
                      className={`h-20 rounded-lg border ${
                        preset.value === 'day' 
                          ? 'bg-gradient-to-br from-blue-300 via-yellow-100 to-sky-200'
                          : preset.value === 'dusk'
                          ? 'bg-gradient-to-br from-orange-400 via-purple-300 to-blue-400'
                          : preset.value === 'dawn'
                          ? 'bg-gradient-to-br from-pink-400 via-rose-300 to-orange-200'
                          : 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950'
                      }`}
                    />
                    <p className="text-sm font-medium text-center">{preset.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🎨 How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Day:</strong> Clean blue sky gradient for bright daylight</li>
                  <li>• <strong>Dusk:</strong> Warm orange/amber gradient for golden hour</li>
                  <li>• <strong>Dawn:</strong> Soft pink/rose gradient for sunrise</li>
                  <li>• <strong>Night:</strong> Dark blue gradient with white text for nighttime</li>
                  <li>• The gradient automatically matches your map's lighting preset</li>
                  <li>• All text colors adapt for optimal readability</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 