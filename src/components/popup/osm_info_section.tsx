import React from 'react';
import { OSMDescription } from './osm_description';
import { OSMHoursTable } from './osm_hours_table';

interface OSMInfoSectionProps {
  isNativePoi: boolean;
  hasOSMEnrichment: boolean;
  osmLookupAttempted: boolean;
  isLoading: boolean;
  address?: string;
  phone?: string;
  website?: string;
  operator?: string;
  brand?: string;
  cuisine?: string;
  amenity?: string;
  shop?: string;
  tourism?: string;
  opening_hours?: string;
}

export const OSMInfoSection: React.FC<OSMInfoSectionProps> = ({
  isNativePoi,
  hasOSMEnrichment,
  osmLookupAttempted,
  isLoading,
  address,
  phone,
  website,
  operator,
  brand,
  cuisine,
  opening_hours
}) => {
  // Don't render anything for non-native POIs
  if (!isNativePoi) {
    return null;
  }

  // Show loading state while fetching OSM data
  if (isLoading && !osmLookupAttempted && !hasOSMEnrichment) {
    return (
      <div className="bg-amber-50 rounded-md p-2">
        <div className="text-sm text-amber-800 flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full"></div>
          <span>🌍 Fetching OpenStreetMap details...</span>
        </div>
      </div>
    );
  }

  // Simple logic: only show sections if we have OSM enrichment AND actual data
  const hasContactInfo = address || phone || website || operator || brand || cuisine;
  
  // If OSM lookup failed, show error state with red X
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
  if (hasOSMEnrichment && !hasContactInfo && !opening_hours) {
    return (
      <div className="bg-gray-50 rounded-md p-2">
        <div className="text-sm text-red-600 flex items-center gap-2">
          <span className="text-red-500">❌</span>
          <span>No additional details available</span>
        </div>
      </div>
    );
  }
  
  // Only render sections that have actual data
  if (!hasOSMEnrichment) {
    return null; // No OSM data yet
  }

  return (
    <div className="space-y-0.5">
      {/* Description Section - only show if we have contact info */}
      {hasContactInfo && (
        <div className="border-l-4 border-blue-300 bg-blue-50 pl-3 pr-3 pt-2 pb-2 rounded-r">
          <h5 className="text-xs font-medium text-blue-800 flex items-center gap-2 mb-2">
            📋 Contact & Details
          </h5>
          <OSMDescription
            address={address}
            phone={phone}
            website={website}
            operator={operator}
            brand={brand}
            cuisine={cuisine}
          />
        </div>
      )}

      {/* Visual separator - only show if both sections exist */}
      {hasContactInfo && opening_hours && (
        <div className="flex justify-center py-1">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>
      )}

      {/* Hours Section - only show if we have opening hours */}
      {opening_hours && (
        <div className="border-l-4 border-green-300 bg-green-50 rounded-r flex">
          {/* Vertical Header */}
          <div className="flex items-center justify-center w-8 pt-0.5 pb-2">
            <h5 className="text-xs font-medium text-green-800 transform -rotate-90 whitespace-nowrap">
              🕐 Hours & Contact
            </h5>
          </div>
          {/* Content Area */}
          <div className="flex-1 pt-0.5 pb-2 pr-3">
            <OSMHoursTable
              opening_hours={opening_hours}
              isLoading={false}
              hasError={false}
              contentOnly={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 