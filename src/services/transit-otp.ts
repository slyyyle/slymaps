import { planTransit, type OTPItinerary, type OTPLeg } from './opentripplanner';
import type { Route, RouteStep } from '@/types/transit/directions';
import type { Coordinates } from '@/types/core';
import polyline from '@mapbox/polyline';

export async function getTransitItinerary(
  start: Coordinates,
  end: Coordinates
): Promise<Route | null> {
  try {
    const otpItinerary = await planTransit(start, end);
    if (!otpItinerary) return null;

    const legs = otpItinerary.legs.map((leg: OTPLeg) => {
      // Decode polyline geometry
      let coordinates: number[][] = [];
      if (leg.legGeometry?.points) {
        try {
          coordinates = polyline.decode(leg.legGeometry.points).map(([lat, lon]) => [lon, lat]);
        } catch (error) {
          console.warn('Failed to decode polyline for leg:', error);
          coordinates = [[leg.from.lon, leg.from.lat], [leg.to.lon, leg.to.lat]];
        }
      } else {
        coordinates = [[leg.from.lon, leg.from.lat], [leg.to.lon, leg.to.lat]];
      }

      // Create route steps (one step per leg)
      const steps: RouteStep[] = [];
      let instruction = '';
      if (leg.mode === 'WALK') {
        instruction = `Walk from ${leg.from.name} to ${leg.to.name}`;
      } else {
        // Use nested route info from OTP GraphQL response
        const routeName = leg.route?.shortName || 'Transit';
        const headsign = leg.headsign ? ` towards ${leg.headsign}` : '';
        const agencyName = leg.route?.agency?.name;
        const agencyText = agencyName ? ` (${agencyName})` : '';
        instruction = `Take ${routeName}${headsign}${agencyText} from ${leg.from.name} to ${leg.to.name}`;
      }
      steps.push({
        maneuver: { instruction, type: leg.mode.toLowerCase(), location: [leg.from.lon, leg.from.lat] },
        distance: leg.distance,
        duration: leg.duration,
        geometry: { type: 'LineString', coordinates }
      });

      const summary = leg.mode === 'WALK'
        ? `Walk to ${leg.to.name}`
        : `${leg.route?.shortName || 'Transit'} to ${leg.to.name}`;

      return {
        steps,
        summary,
        distance: leg.distance,
        duration: leg.duration
      };
    });

    // Merge step geometries for the overall route
    const allCoordinates: number[][] = [];
    legs.forEach(leg => {
      leg.steps.forEach(step => {
        if (step.geometry?.type === 'LineString') {
          allCoordinates.push(...step.geometry.coordinates);
        }
      });
    });
    const uniqueCoordinates = allCoordinates.filter((coord, i) => i === 0 || coord[0] !== allCoordinates[i-1][0] || coord[1] !== allCoordinates[i-1][1]);
    const geometry: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: uniqueCoordinates.length > 1 ? uniqueCoordinates : [[start.longitude, start.latitude], [end.longitude, end.latitude]]
    };

    return {
      id: `otp-${Date.now()}`,
      geometry,
      legs,
      distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
      duration: otpItinerary.duration
    };
  } catch (error) {
    console.error('Error getting transit itinerary:', error);
    return null;
  }
} 