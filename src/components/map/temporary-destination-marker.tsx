import React, { useState, useEffect } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Coordinates } from '@/types/core';

interface TemporaryDestinationMarkerProps {
  coordinates: Coordinates;
  onConfirm: (coords: Coordinates) => void;
  onCancel: () => void;
  autoConfirmDelay?: number; // Auto-confirm after N seconds
}

export function TemporaryDestinationMarker({
  coordinates,
  onConfirm,
  onCancel,
  autoConfirmDelay = 3000 // 3 seconds default
}: TemporaryDestinationMarkerProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(autoConfirmDelay / 1000);

  // Show confirmation popup after a brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfirmation(true);
    }, 500); // Half second delay for smooth UX

    return () => clearTimeout(timer);
  }, []);

  // Auto-confirm countdown
  useEffect(() => {
    if (!showConfirmation) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onConfirm(coordinates);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showConfirmation, coordinates, onConfirm]);

  return (
    <>
      {/* Animated Pin Marker */}
      <Marker
        longitude={coordinates.longitude}
        latitude={coordinates.latitude}
        anchor="bottom"
      >
        <div className="relative">
          {/* Pulsing animation ring */}
          <div className="absolute -inset-4 bg-blue-500/30 rounded-full animate-ping" />
          <div className="absolute -inset-2 bg-blue-500/50 rounded-full animate-pulse" />
          
          {/* Main pin */}
          <div className="relative bg-blue-600 text-white p-2 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110">
            <Icons.MapPin className="w-6 h-6" />
          </div>
        </div>
      </Marker>

      {/* Confirmation Popup */}
      {showConfirmation && (
        <Marker
          longitude={coordinates.longitude}
          latitude={coordinates.latitude}
          anchor="bottom"
          offset={[0, -60]} // Position above the pin
        >
          <Card className="bg-background/95 backdrop-blur-sm border shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            <CardContent className="p-3">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Set as destination?</p>
                <p className="text-xs text-muted-foreground">
                  {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => onConfirm(coordinates)}
                    className="flex-1"
                  >
                    <Icons.MapPin className="w-3 h-3 mr-1" />
                    Set ({countdown}s)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onCancel}
                  >
                    <Icons.Close className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Marker>
      )}
    </>
  );
} 