"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * Example showing how to use the new CSS layers system with your existing popup components.
 * 
 * Key Features:
 * 1. Add 'mapbox-popup-container' class to the Popup component
 * 2. All shadcn components work perfectly inside without !important
 * 3. Full theme support with CSS custom properties
 * 4. Mobile responsive and accessible
 */

interface ExampleLocationPopupProps {
  data: {
    name: string;
    category: string;
    description: string;
    lat: number;
    lng: number;
    status: 'active' | 'inactive';
  };
  onClose: () => void;
  onViewDetails: () => void;
}

export const ExampleLocationPopup: React.FC<ExampleLocationPopupProps> = ({
  data,
  onClose,
  onViewDetails,
}) => {
  return (
    // This would be wrapped in your existing Popup component
    // <Popup className="mapbox-popup-container" ...otherProps>
    <div className="mapbox-popup-container">
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {data.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-lg leading-tight">{data.name}</CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {data.category}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.description}
          </p>
          
          <Separator />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  data.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`} 
              />
              <span>{data.status === 'active' ? 'Open Now' : 'Closed'}</span>
            </div>
            <span className="font-mono">
              {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
            </span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button onClick={onViewDetails} className="flex-1">
              View Details
            </Button>
            <Button variant="outline" size="sm" className="px-3">
              📍
            </Button>
            <Button variant="outline" size="sm" className="px-3">
              ↗️
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    // </Popup>
  );
};

/**
 * Example with multiple theme variants
 */
export const ThemedPopupExamples = () => {
  const sampleData = {
    name: "Central Park",
    category: "Park",
    description: "A large public park in New York City with beautiful landscapes, walking paths, and recreational areas.",
    lat: 40.7829,
    lng: -73.9654,
    status: 'active' as const,
  };

  return (
    <div className="space-y-8 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Default Theme</h3>
        <ExampleLocationPopup 
          data={sampleData}
          onClose={() => console.log('close')}
          onViewDetails={() => console.log('details')}
        />
      </div>
      
      <div className="dark">
        <h3 className="text-lg font-semibold mb-4">Dark Theme</h3>
        <ExampleLocationPopup 
          data={sampleData}
          onClose={() => console.log('close')}
          onViewDetails={() => console.log('details')}
        />
      </div>
    </div>
  );
};

export default ExampleLocationPopup; 