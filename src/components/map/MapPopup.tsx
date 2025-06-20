"use client";

import React from 'react';
import PopupWrapper from '@/components/map/PopupWrapper';
import { Loader2 } from 'lucide-react';
import { TransitSection, ActionsSection } from '@/components/popup/popup-sections';
import { OSMInfoSection } from '@/components/popup/osm_info_section';
import { useStopSchedule } from '@/hooks/data/use-stop-schedule';
import { useStopHours } from '@/hooks/data/use-stop-hours';
import { useStopArrivals } from '@/hooks/data/use-stop-arrivals';
import { useFetchStopSituations } from '@/hooks/data/use-stop-situations';
import type { ObaAgency } from '@/types/transit/oba';
import type { Place } from '@/types/core';
import type { MapRef } from 'react-map-gl/mapbox';

interface MapPopupProps {
  poi: Place;
  popupTheme: string;
  onClose: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export const MapPopup: React.FC<MapPopupProps> = ({ poi, popupTheme, onClose, mapRef }) => {
  const isStop = Boolean(poi.isObaStop);
  // Fetch stop schedule including references for agencies
  const stopScheduleQuery = useStopSchedule(isStop ? poi.id : null);
  // Extract agencies from stop schedule references
  const agencies: ObaAgency[] = Array.isArray(stopScheduleQuery.data?.references?.agencies)
    ? stopScheduleQuery.data.references.agencies
    : [];
  // Fetch OSM data for generic POI hours and contact
  const hoursQuery = useStopHours(poi.name, poi.latitude, poi.longitude);
  // For transit stops, also wait for arrivals and situations
  const { scheduleQuery: arrivalsQuery } = useStopArrivals(isStop ? poi.id : '');
  const situationsQuery = useFetchStopSituations(isStop ? poi.id : '');
  // Safely get route IDs
  const routeIds: string[] = Array.isArray(poi.properties?.route_ids)
    ? (poi.properties.route_ids as string[])
    : [];

  // Universal loading state - wait for ALL relevant queries to complete
  const isUniversalLoading = (() => {
    if (isStop) {
      // For transit stops, wait for ALL transit-related data
      return (
        stopScheduleQuery.isLoading ||
        arrivalsQuery.isLoading ||
        situationsQuery.isLoading
      );
    } else {
      // For POIs, wait for OSM enrichment if it's a native POI
      return poi.isNativePoi ? hoursQuery.isLoading : false;
    }
  })();

  return (
    <PopupWrapper
      longitude={poi.longitude}
      latitude={poi.latitude}
      onClose={onClose}
      className={popupTheme}
      autoAnchor={true}
      mapRef={mapRef}
      closeOnClick={false}
      closeButton={true}
      offset={[0, -10]}
      maxWidth="380px"
    >
      <div onClick={(e) => e.stopPropagation()}>
        {isUniversalLoading ? (
          <div
            className="min-w-[320px] bg-card text-card-foreground rounded-lg p-4 flex flex-col items-center justify-center py-8 space-y-3"
            style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <div
            className="min-w-[320px] bg-card text-card-foreground rounded-lg p-4 space-y-3"
            style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
          >
            {isStop ? (
              <>
                <div className="px-4 pt-3">
                  <div className="text-lg font-semibold">{poi.name}</div>
                  <div className="flex items-center justify-between mt-1 pb-2">
                    <span className="text-sm text-muted-foreground">Transit Stop</span>
                    <ActionsSection
                      poi={poi}
                      onDirections={() => console.log('Directions to stop', poi.name)}
                      onSave={() => console.log('Save stop', poi.name)}
                    />
                  </div>
                </div>
                <TransitSection stopId={poi.id} poi={poi} agencies={agencies} routeIds={routeIds} />
              </>
            ) : (
              <>
                {/* Title on its own line */}
                <div className="px-4 pt-3">
                  <div className="text-lg font-semibold">
                    {(() => {
                      const osmName = hoursQuery.data?.name as string | undefined;
                      return osmName || poi.name;
                    })()}
                  </div>
                  {/* Subclass and actions inline */}
                  <div className="flex items-center justify-between mt-1 pb-2">
                    {(() => {
                      const formatForDisplay = (value: string) =>
                        value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      const poiSubclass = poi.properties?.subclass as string | undefined;
                      if (poiSubclass) return <div className="text-sm text-muted-foreground">{formatForDisplay(poiSubclass)}</div>;
                      const osmSubclass = hoursQuery.data?.subclass as string | undefined;
                      if (osmSubclass) return <div className="text-sm text-muted-foreground">{formatForDisplay(osmSubclass)}</div>;
                      if (poi.type) return <div className="text-sm text-muted-foreground">{formatForDisplay(poi.type)}</div>;
                      return null;
                    })()}
                    <ActionsSection poi={poi} onDirections={() => console.log('Directions:', poi.name)} onSave={() => console.log('Save:', poi.name)} />
                  </div>
                </div>
                {poi.isNativePoi && (
                  <OSMInfoSection
                    isNativePoi={Boolean(poi.isNativePoi)}
                    hasOSMEnrichment={!!hoursQuery.data}
                    osmLookupAttempted={hoursQuery.isFetched}
                    address={hoursQuery.data?.address}
                    phone={hoursQuery.data?.phone as string | undefined}
                    website={hoursQuery.data?.website as string | undefined}
                    operator={hoursQuery.data?.operator as string | undefined}
                    cuisine={hoursQuery.data?.cuisine as string | undefined}
                    amenity={hoursQuery.data?.amenity as string | undefined}
                    shop={hoursQuery.data?.shop as string | undefined}
                    tourism={hoursQuery.data?.tourism as string | undefined}
                    opening_hours={hoursQuery.data?.opening_hours as string | undefined}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </PopupWrapper>
  );
};

export default MapPopup; 