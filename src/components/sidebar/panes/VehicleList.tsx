import React from 'react';
import { useRouteData } from '@/hooks/data/use-route-data';
import { useMapRouteHandler } from '@/hooks/map';
import { VehicleStatusDisplay } from '@/components/sidebar/VehicleStatusDisplay';
import { useTransitStore } from '@/stores/use-transit-store';
import { usePlaceStore } from '@/stores/use-place-store';
import type { ObaVehicleLocation, ObaStopSearchResult } from '@/types/transit/oba';
import type { Place } from '@/types/core';

/**
 * Renders a scrollable list of live vehicles for the active route & branch,
 * showing Bus ID and next stop ETA, with click/hover highlighting.
 */
export function VehicleList() {
  const { getActiveRoute, getSelectedSegmentIndex } = useMapRouteHandler();
  const activeRoute = getActiveRoute();
  const storeRouteId = activeRoute?.id ?? null;
  const obaRouteId = activeRoute?.obaRoute?.id ?? null;
  const branchIndex = storeRouteId ? getSelectedSegmentIndex(storeRouteId) : 0;
  const { detailsQuery, vehiclesQuery } = useRouteData(obaRouteId);
  const branchName = detailsQuery.data?.branches?.[branchIndex]?.name;
  const vehicles: ObaVehicleLocation[] = vehiclesQuery.data ?? [];
  
  // Get stops for this branch
  const routeStops = detailsQuery.data?.branches?.[branchIndex]?.stops ?? [];

  const filteredVehicles = React.useMemo(() => {
    // Debug logging for vehicle filtering
    if (process.env.NODE_ENV === 'development') {
      console.log('🚌 Vehicle filtering debug:', {
        totalVehicles: vehicles.length,
        branchName,
        sampleVehicle: vehicles[0] ? {
          id: vehicles[0].id,
          nextStopId: vehicles[0].nextStopId,
          nextStopTimeOffset: vehicles[0].nextStopTimeOffset,
          closestStopId: vehicles[0].closestStopId,
          predicted: vehicles[0].predicted,
          tripHeadsign: vehicles[0].tripHeadsign,
          // Show all properties
          allProps: Object.keys(vehicles[0])
        } : null
      });
    }
    
    // If no specific branch selected, show all vehicles
    if (!branchName) return vehicles;
    // Filter vehicles by branch stops: nextStopId or closestStopId must be in routeStops
    const branchStopIds = new Set<string>(routeStops.map((s: Place) => s.id));
    return vehicles.filter(v => 
      (v.nextStopId != null && branchStopIds.has(v.nextStopId)) ||
      (v.closestStopId != null && branchStopIds.has(v.closestStopId))
    );
  }, [vehicles, branchName, routeStops]);

  if (filteredVehicles.length === 0) return null;

  return (
    <div className="py-2">
      <div className="space-y-2">
        {filteredVehicles.map(vehicle => (
          <VehicleRow key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  );
}

function VehicleRow({ vehicle }: { vehicle: ObaVehicleLocation }) {
  // Debug what vehicle data we're receiving
  if (process.env.NODE_ENV === 'development') {
    console.log('🚗 VehicleRow received:', {
      vehicleId: vehicle.id,
      nextStopId: vehicle.nextStopId,
      nextStopTimeOffset: vehicle.nextStopTimeOffset,
      closestStopId: vehicle.closestStopId,
      predicted: vehicle.predicted
    });
  }
  
  const selectedVehicleId = useTransitStore(state => state.selectedVehicleId);
  const setSelectedVehicleId = useTransitStore(state => state.setSelectedVehicleId);
  const setHoveredVehicle = useTransitStore(state => state.setHoveredVehicle);
  const clearPOISelection = usePlaceStore(state => state.clearSelection);

  const handleSelect = () => {
    clearPOISelection();
    setSelectedVehicleId(vehicle.id);
  };

  const handleVehicleHover = (isHovering: boolean) => {
    setHoveredVehicle(isHovering ? vehicle.id : null);
  };

  return (
    <VehicleStatusDisplay
      vehicle={vehicle}
      isSelected={selectedVehicleId === vehicle.id}
      onSelect={handleSelect}
      onVehicleHover={handleVehicleHover}
    />
  );
}
