import React, { useMemo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { PointOfInterest } from '@/types/core';

export interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  pois: PointOfInterest[];
}

interface ClusteredMarkersProps {
  pois: PointOfInterest[];
  zoom: number;
  onMarkerClick: (poi: PointOfInterest) => void;
  onClusterClick: (cluster: ClusterPoint) => void;
}

export function ClusteredMarkers({ pois, zoom, onMarkerClick, onClusterClick }: ClusteredMarkersProps) {
  const clusters = useMemo(() => createClusters(pois, zoom), [pois, zoom]);

  return (
    <>
      {clusters.map(cluster => (
        <Marker
          key={cluster.id}
          latitude={cluster.latitude}
          longitude={cluster.longitude}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            if (cluster.count > 1) {
              onClusterClick(cluster);
            } else {
              onMarkerClick(cluster.pois[0]);
            }
          }}
        >
          {cluster.count > 1 ? (
            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-blue-600">
              {cluster.count}
            </div>
          ) : (
            <div className="cursor-pointer hover:scale-110 transition-transform">
              {/* Render individual POI marker, delegate to parent onMarkerClick */}
              <div className="bg-red-600 text-white p-1 rounded-full">
                {/* Could insert a custom icon here if desired */}
                <span className="text-xs">•</span>
              </div>
            </div>
          )}
        </Marker>
      ))}
    </>
  );
}

function createClusters(pois: PointOfInterest[], zoom: number): ClusterPoint[] {
  const radiusMeters = getClusterRadius(zoom);
  const clusters: ClusterPoint[] = [];
  const visited = new Set<string>();

  for (const poi of pois) {
    if (visited.has(poi.id)) continue;
    const group = [poi];
    visited.add(poi.id);

    for (const other of pois) {
      if (visited.has(other.id)) continue;
      const distance = getDistance(
        { latitude: poi.latitude, longitude: poi.longitude },
        { latitude: other.latitude, longitude: other.longitude }
      );
      if (distance <= radiusMeters) {
        group.push(other);
        visited.add(other.id);
      }
    }

    const lat = group.reduce((sum, p) => sum + p.latitude, 0) / group.length;
    const lng = group.reduce((sum, p) => sum + p.longitude, 0) / group.length;
    clusters.push({
      id: `cluster-${group.map(p => p.id).join('-')}`,
      latitude: lat,
      longitude: lng,
      count: group.length,
      pois: group
    });
  }

  return clusters;
}

function getClusterRadius(zoom: number): number {
  if (zoom < 10) {
    return 5000;
  }
  if (zoom < 13) {
    return 1000;
  }
  if (zoom < 16) {
    return 200;
  }
  // Disable clustering at high zoom so individual markers show
  return 0;
}

// Haversine formula to compute distance between two lat/lng pairs in meters
function getDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ),
      Math.sqrt(1 - (sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ))
    );

  return R * c;
} 