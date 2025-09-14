import React from 'react';
import { OSMDescription } from './osm_description';
import type { AddressInput } from '@/utils/address-utils';

interface OSMInfoSectionProps {
  isNativePoi: boolean;
  hasOSMEnrichment: boolean;
  osmLookupAttempted: boolean;
  address?: AddressInput;
  phone?: string;
  website?: string;
  operator?: string;
  cuisine?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
}

export const OSMInfoSection: React.FC<OSMInfoSectionProps> = ({
  isNativePoi,
  hasOSMEnrichment,
  osmLookupAttempted,
  address,
  phone,
  website,
  operator,
  cuisine,
  opening_hours,
  latitude,
  longitude
}) => {
  // Simple logic: only show sections if we have OSM enrichment AND actual data
  const hasContactInfo = address || phone || website || operator || cuisine;
  const hasHours = opening_hours && opening_hours.trim() !== '';
  
  // Debug logging
  console.log('OSMInfoSection props:', {
    isNativePoi,
    hasOSMEnrichment,
    osmLookupAttempted,
    opening_hours,
    hasContactInfo: Boolean(address || phone || website || operator || cuisine),
    hasHours
  });

  // Don't render anything for non-native POIs
  if (!isNativePoi) {
    return null;
  }

  // If still loading (no enrichment yet), show lightweight placeholder
  if (!hasOSMEnrichment && !osmLookupAttempted) {
    return (
      <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-500 flex items-center gap-2">
        <span className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></span>
        Loading details…
      </div>
    );
  }

  // If OSM lookup failed/errored, show error state 
  if (osmLookupAttempted && !hasOSMEnrichment) {
    return (
      <div className="bg-red-50 rounded-md p-2">
        <div className="text-sm text-red-600 flex items-center gap-2">
          <span className="text-red-500">❌</span>
          <span>No OpenStreetMap data available</span>
        </div>
      </div>
    );
  }
  
  // If OSM succeeded but no useful data, show different message
  if (hasOSMEnrichment && !hasContactInfo && !hasHours) {
    return (
      <div className="bg-gray-50 rounded-md p-2">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="text-gray-500">ℹ️</span>
          <span>No additional details available</span>
        </div>
      </div>
    );
  }
  
  // Only render sections that have actual data
  if (!hasOSMEnrichment) {
    return null; // No OSM data yet
  }

  // Single Details section
  return (
    <div className="bg-card border border-border rounded-md pt-[3px] px-3 pb-3">
      <OSMDescription
        variant="double"
        address={address}
        phone={phone}
        website={website}
        operator={operator}
        cuisine={cuisine}
        opening_hours={opening_hours}
        latitude={latitude}
        longitude={longitude}
      />
    </div>
  );
}; 