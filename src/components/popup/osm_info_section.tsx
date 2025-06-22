import React from 'react';
import { OSMDescription } from './osm_description';
import { OSMHoursTable } from './osm_hours_table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  opening_hours
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

  // If we only have one type of content, show it without tabs
  if (hasContactInfo && !hasHours) {
    return (
      <div className="bg-card border border-border rounded-md pt-[3px] px-3 pb-3">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 p-0.5">
            <TabsTrigger value="details" className="text-xs px-2 py-1">
              📋 Details
            </TabsTrigger>
            <TabsTrigger 
              value="hours" 
              className="text-xs px-2 py-1"
              disabled={true}
            >
              🕐 Hours (NA)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-[3px]">
            <OSMDescription
              variant="double"
              address={address}
              phone={phone}
              website={website}
              operator={operator}
              cuisine={cuisine}
            />
          </TabsContent>
          
          <TabsContent value="hours" className="mt-[3px]">
            <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
              No Hours Available
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (!hasContactInfo && hasHours) {
    return (
      <div className="bg-card border border-border rounded-md pt-[3px] px-3 pb-3">
        <Tabs defaultValue="hours" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 p-0.5">
            <TabsTrigger 
              value="details" 
              className="text-xs px-2 py-1"
              disabled={true}
            >
              📋 Details (NA)
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs px-2 py-1">
              🕐 Hours
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-[3px]">
            <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
              No Details Available
            </div>
          </TabsContent>
          
          <TabsContent value="hours" className="mt-[3px]">
            <OSMHoursTable
              opening_hours={opening_hours}
              isLoading={false}
              hasError={false}
              contentOnly={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // If we have both types of content, show tabs
  return (
    <div className="bg-card border border-border rounded-md pt-[3px] px-3 pb-3">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 p-0.5">
          <TabsTrigger value="details" className="text-xs px-2 py-1">
            📋 Details
          </TabsTrigger>
          <TabsTrigger 
            value="hours" 
            className="text-xs px-2 py-1"
            disabled={!hasHours}
          >
            {hasHours ? "🕐 Hours" : "🕐 Hours (NA)"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-[3px]">
          <OSMDescription
            variant="double"
            address={address}
            phone={phone}
            website={website}
            operator={operator}
            cuisine={cuisine}
          />
        </TabsContent>
        
        <TabsContent value="hours" className="mt-[3px]">
          <OSMHoursTable
            opening_hours={opening_hours}
            isLoading={false}
            hasError={false}
            contentOnly={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 