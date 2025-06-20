import { useMemo } from 'react';
import type { ObaVehicleLocation, ObaStopSearchResult } from '@/types/transit/oba';
import { useStopData } from '@/hooks/data/use-stop-data';

interface VehicleStopInfo {
  // Semantic interpretation of vehicle status
  situation: 'approaching' | 'at_stop' | 'between_stops' | 'unknown';
  
  // Current stop information
  currentStopId: string | null;
  currentStopName: string | null;
  currentStopTimeOffset: number | null; // seconds (negative = passed, positive = approaching)
  
  // Next stop information  
  nextStopId: string | null;
  nextStopName: string | null;
  nextStopTimeOffset: number | null; // seconds until arrival
  
  // Metadata
  confidence: 'high' | 'medium' | 'low';
  dataSource: 'real_time' | 'schedule' | 'inferred';
  isRealTime: boolean;
}

export function useVehicleStopInfo(
  vehicle: ObaVehicleLocation
): VehicleStopInfo {
  // Always fetch stop data via API when we have stop IDs
  const nextStopQuery = useStopData(vehicle.nextStopId);
  const closestStopQuery = useStopData(vehicle.closestStopId);
  
  return useMemo(() => {
    const isRealTime = vehicle.predicted === true;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Vehicle stop analysis:', {
        vehicleId: vehicle.id,
        nextStopId: vehicle.nextStopId,
        nextStopTimeOffset: vehicle.nextStopTimeOffset,
        closestStopId: vehicle.closestStopId,
        closestStopTimeOffset: vehicle.closestStopTimeOffset,
        predicted: vehicle.predicted,
        nextStopData: nextStopQuery.data?.name,
        closestStopData: closestStopQuery.data?.name,
        nextStopLoading: nextStopQuery.isLoading,
        closestStopLoading: closestStopQuery.isLoading
      });
    }

    // Get stop names from API data
    const nextStopName = nextStopQuery.data?.name || null;
    const closestStopName = closestStopQuery.data?.name || null;

    // Case 1: Vehicle has both nextStop and closestStop data (ideal scenario)
    if (vehicle.nextStopId && vehicle.closestStopId && 
        vehicle.nextStopTimeOffset != null && vehicle.closestStopTimeOffset != null) {
      
      // Same stop = approaching that stop
      if (vehicle.nextStopId === vehicle.closestStopId) {
        return {
          situation: 'approaching',
          currentStopId: null, // Not at a stop yet
          currentStopName: null,
          currentStopTimeOffset: null,
          nextStopId: vehicle.nextStopId,
          nextStopName: nextStopName || `Stop ${vehicle.nextStopId.split('_').pop()}`,
          nextStopTimeOffset: vehicle.nextStopTimeOffset,
          confidence: 'high',
          dataSource: isRealTime ? 'real_time' : 'schedule',
          isRealTime,
        };
      }
      
      // Different stops = at closest, heading to next
      return {
        situation: 'at_stop',
        currentStopId: vehicle.closestStopId,
        currentStopName: closestStopName || `Stop ${vehicle.closestStopId.split('_').pop()}`,
        currentStopTimeOffset: vehicle.closestStopTimeOffset || null,
        nextStopId: vehicle.nextStopId,
        nextStopName: nextStopName || `Stop ${vehicle.nextStopId.split('_').pop()}`,
        nextStopTimeOffset: vehicle.nextStopTimeOffset,
        confidence: 'high',
        dataSource: isRealTime ? 'real_time' : 'schedule',
        isRealTime,
      };
    }

    // Case 2: nextStop data with timing available
    if (vehicle.nextStopId && vehicle.nextStopTimeOffset != null) {
      return {
        situation: 'approaching',
        currentStopId: null,
        currentStopName: null,
        currentStopTimeOffset: null,
        nextStopId: vehicle.nextStopId,
        nextStopName: nextStopName || `Stop ${vehicle.nextStopId.split('_').pop()}`,
        nextStopTimeOffset: vehicle.nextStopTimeOffset,
        confidence: 'medium',
        dataSource: isRealTime ? 'real_time' : 'schedule',
        isRealTime,
      };
    }

    // Case 2.5: nextStop data without timing (still useful!)
    if (vehicle.nextStopId) {
      return {
        situation: 'approaching',
        currentStopId: null,
        currentStopName: null,
        currentStopTimeOffset: null,
        nextStopId: vehicle.nextStopId,
        nextStopName: nextStopName || `Stop ${vehicle.nextStopId.split('_').pop()}`,
        nextStopTimeOffset: null, // No timing available
        confidence: 'medium',
        dataSource: isRealTime ? 'real_time' : 'schedule',
        isRealTime,
      };
    }

    // Case 3: Only closestStop data available
    if (vehicle.closestStopId) {
      // Determine if at stop or between stops based on time offset
      const isAtStop = vehicle.closestStopTimeOffset != null && 
                      Math.abs(vehicle.closestStopTimeOffset) < 30; // Within 30 seconds = at stop

      return {
        situation: isAtStop ? 'at_stop' : 'between_stops',
        currentStopId: vehicle.closestStopId,
        currentStopName: closestStopName || `Stop ${vehicle.closestStopId.split('_').pop()}`,
        currentStopTimeOffset: vehicle.closestStopTimeOffset || null,
        nextStopId: null,
        nextStopName: null,
        nextStopTimeOffset: null, // Can't estimate without real-time data
        confidence: 'medium',
        dataSource: 'inferred',
        isRealTime,
      };
    }

    // Case 4: No useful stop data
    return {
      situation: 'unknown',
      currentStopId: null,
      currentStopName: null,
      currentStopTimeOffset: null,
      nextStopId: null,
      nextStopName: null,
      nextStopTimeOffset: null,
      confidence: 'low',
      dataSource: 'inferred',
      isRealTime,
    };
  }, [vehicle, nextStopQuery.data, closestStopQuery.data, nextStopQuery.isLoading, closestStopQuery.isLoading]);
} 