import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { ObaVehicleLocation, ObaStopSearchResult } from '@/types/transit/oba';
import { useVehicleStopInfo } from '@/hooks/data/use-vehicle-stop-info';

interface VehicleStatusDisplayProps {
  vehicle: ObaVehicleLocation;
  isSelected?: boolean;
  onSelect?: () => void;
  onVehicleHover?: (isHovering: boolean) => void;
}

export function VehicleStatusDisplay({ 
  vehicle, 
  isSelected = false,
  onSelect,
  onVehicleHover 
}: VehicleStatusDisplayProps) {
  const stopInfo = useVehicleStopInfo(vehicle);

  // Countdown for live next-stop ETA in seconds (only for approaching vehicles)
  const [countdown, setCountdown] = useState<number | null>(null);

  // Format time display (seconds to human readable)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  // Format schedule deviation
  const formatScheduleDeviation = (deviation: number): { text: string; color: string } => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 60) {
      return { text: 'On time', color: 'text-green-600' };
    }
    
    const minutes = Math.round(absDeviation / 60);
    if (deviation < 0) {
      return { text: `${minutes}m early`, color: 'text-blue-600' };
    } else {
      return { text: `${minutes}m late`, color: 'text-orange-600' };
    }
  };

  // Get situation-specific display
  const getSituationDisplay = () => {
    switch (stopInfo.situation) {
      case 'approaching':
        return {
          // Show 'DRIVING' label and arrow icon
          icon: (
            <span className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase">DRIVING</span>
              <span className="text-lg">→</span>
            </span>
          ),
          primary: stopInfo.nextStopName || '',
          secondary: countdown != null ? formatTime(countdown) : null,
          color: 'border-blue-500'
        };

      case 'at_stop':
        return {
          // Show 'ARRIVED' label and stop icon
          icon: (
            <span className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase">ARRIVED</span>
              <span className="text-lg">🚏</span>
            </span>
          ),
          primary: stopInfo.currentStopName || '',
          secondary: stopInfo.nextStopName ? `→ ${stopInfo.nextStopName}` : null,
          color: 'border-green-500'
        };

      case 'between_stops':
        return {
          icon: '🛣️',
          primary: stopInfo.nextStopName ? `Heading to ${stopInfo.nextStopName}` : 'In transit',
          secondary: stopInfo.currentStopName ? `From ${stopInfo.currentStopName}` : null,
          color: 'border-yellow-500'
        };

      case 'unknown':
      default:
        return {
          icon: '📍',
          primary: stopInfo.isRealTime ? 'Live tracking' : 'Scheduled service',
          secondary: null,
          color: 'border-gray-400'
        };
    }
  };

  const display = getSituationDisplay();
  const scheduleInfo = vehicle.scheduleDeviation ? formatScheduleDeviation(vehicle.scheduleDeviation) : null;
  useEffect(() => {
    if (stopInfo.nextStopTimeOffset != null) {
      setCountdown(stopInfo.nextStopTimeOffset);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev == null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [stopInfo.nextStopTimeOffset]);

  const handleClick = () => {
    onSelect?.();
    const activeStopId = stopInfo.currentStopId || stopInfo.nextStopId;
    if (activeStopId) {
      onVehicleHover?.(true);
    }
  };

  const handleMouseEnter = () => {
    const hoverStopId = stopInfo.currentStopId || stopInfo.nextStopId;
    onVehicleHover?.(true);
  };

  const handleMouseLeave = () => {
    onVehicleHover?.(false);
  };

  // Simplified gradient approach
  const { situation } = stopInfo;
  let borderGradient: string | undefined;
  if (situation === 'at_stop') {
    // Arrived: green to blue gradient
    borderGradient = 'linear-gradient(to right, #22c55e, #3b82f6)';
  } else if (situation === 'approaching') {
    // Driving: yellow to orange gradient
    borderGradient = 'linear-gradient(to right, #eab308, #f97316)';
  }
  // Determine base classes
  const baseClasses = `p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isSelected ? 'bg-primary/20 ' : ''}`;
  // If no gradient (e.g. other situations), fall back to display.color
  const fallbackBorderClass = !borderGradient ? display.color : '';
  const finalClassName = `${baseClasses}${fallbackBorderClass}`;

  return (
    <div
      className={finalClassName}
      style={borderGradient ? { borderImageSlice: 1, borderImageSource: borderGradient, borderStyle: 'solid' } : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with vehicle ID and status indicators */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Icons.Bus className="h-4 w-4 text-current" />
            {vehicle.id.split('_').pop()}
          </div>
          {scheduleInfo && (
            <span className={`text-xs ${scheduleInfo.color}`}>{scheduleInfo.text}</span>
          )}
          <div className="flex items-center gap-1">
            {/* Confidence indicator */}
            <div className="flex text-xs">
              {Array.from({ length: 3 }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < (stopInfo.confidence === 'high' ? 3 : stopInfo.confidence === 'medium' ? 2 : 1)
                      ? 'text-green-500'
                      : 'text-gray-300'
                  }
                >
                  ●
                </span>
              ))}
            </div>
          </div>
        </div>
        <span className="text-lg">{display.icon}</span>
      </div>

      {/* Main status */}
      {(stopInfo.situation === 'approaching' || stopInfo.situation === 'at_stop') ? (
        <div className="flex items-center justify-between">
          <div className="font-medium text-xs">{display.primary}</div>
          {countdown != null && (
            <div className="text-xs text-gray-600 ml-2">{formatTime(countdown)}</div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="font-medium text-xs">{display.primary}</div>
          {display.secondary && (
            <div className="text-xs text-gray-600">{display.secondary}</div>
          )}
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-gray-400">Debug</summary>
          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify({
              situation: stopInfo.situation,
              confidence: stopInfo.confidence,
              nextStopTimeOffset: vehicle.nextStopTimeOffset,
              closestStopTimeOffset: vehicle.closestStopTimeOffset,
              scheduleDeviation: vehicle.scheduleDeviation,
              predicted: vehicle.predicted
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
} 