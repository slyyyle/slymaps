// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Navigation, Heart, Share } from 'lucide-react';
import { Icons } from '@/components/icons';
import type { PopupSection, TransitSectionData, HoursSectionData, PhotosSectionData, NearbySectionData } from '@/types/ui/popup';
import type { ObaAgency, ObaRoute } from '@/types/transit/oba';
import { openingHoursParser } from '@/services/opening-hours-parser';
import { usePlaceStore } from '@/stores/use-place-store';
import { useToast } from '@/hooks/ui/use-toast';
import { formatAddressLines } from '@/utils/address-utils';
import { useRouteHandler } from '@/hooks/map/use-route-handler';
import { useStopArrivals } from '@/hooks/data/use-stop-arrivals';
import { useFetchStopSituations } from '@/hooks/data/use-stop-situations';
import type { ObaArrivalDeparture } from '@/types/transit/oba';
import { useStopHours } from '@/hooks/data/use-stop-hours';
import { useNearbyOSM } from '@/hooks/data/use-nearby-osm';

// Simple loading spinner
const Spinner = () => <Loader2 className="h-4 w-4 animate-spin" />;

// Simple retry button
const RetryButton = ({ onRetry }: { onRetry: () => void }) => (
  <Button variant="ghost" size="sm" onClick={onRetry} className="h-auto p-1 text-xs">
    <RotateCcw className="h-3 w-3 mr-1" />
    Retry
  </Button>
);

// Format time until arrival
const formatArrivalTime = (predictedTime: number | null, scheduledTime: number): string => {
  const useTime = predictedTime || scheduledTime;
  const now = Date.now();
  const diffMinutes = Math.round((useTime - now) / (1000 * 60));
  
  if (diffMinutes < 0) return 'Departed';
  if (diffMinutes === 0) return 'Now';
  if (diffMinutes === 1) return '1 min';
  return `${diffMinutes} mins`;
};

// Removed formatOpeningHours - now using openingHoursParser for table display

interface SectionProps<T> {
  section: PopupSection<T>
  onRetry?: () => void
}

// Transit Section: upcoming arrivals for a stop
export const TransitSection = ({ stopId, poi, agencies, routeIds }: { stopId: string, poi: Place, agencies: ObaAgency[], routeIds: string[] }) => {
  const { scheduleQuery, arrivals } = useStopArrivals(stopId);
  const situationsQuery = useFetchStopSituations(stopId);
  // Use route handler to switch routes and track vehicles
  const routeHandler = useRouteHandler({ enableVehicleTracking: true });
  // Helper to switch to a route at this stop: clear old routes and load the new one
  const handleRouteSwitch = async (routeId: string) => {
    routeHandler.clearAllRoutes();
    await routeHandler.addOBARouteFromStop(routeId, poi.id);
  };

  // Show Service Alerts container in dev and capture real stop situations
  const isDev = process.env.NODE_ENV !== 'production';
  const stopSituations = situationsQuery.data || [];

  if (!stopId) return null;
  return (
    <>
      {/* Service Alerts section */}
      {(isDev || stopSituations.length > 0) && (
        <div className="bg-red-50 border-2 border-red-500 rounded-md p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-red-900 flex items-center gap-2">
              ⚠️ Service Alerts
            </h4>
            {!isDev && situationsQuery.isError && <RetryButton onRetry={() => situationsQuery.refetch()} />}
          </div>
          <div className="space-y-1 text-xs text-red-700">
            {isDev && (
              <div key="dev-test-alert">Development-only test alert.</div>
            )}
            {stopSituations.map(s => (
              <div key={s.id}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {s.summary}
                  </a>
                ) : (
                  <span>{s.summary}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stop Details section */}
      <div className="bg-orange-50 border-2 border-orange-500 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-orange-900 flex items-center gap-2">
            <Icons.CircleDot className="h-4 w-4" />
            Stop Details
          </h4>
        </div>
        <div className="text-sm text-muted">{poi.name}</div>
        <div className="text-xs text-muted">Code: {String(poi.properties?.stop_code)}</div>
      </div>
      {/* Agency Details section */}
      {agencies.length > 0 && (
        <div className="bg-green-50 border-2 border-green-500 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Icons.Bus className="h-4 w-4" />
              Agency Details
            </h4>
          </div>
          <div className="space-y-1 text-xs text-blue-700">
            {agencies.map(a => (
              <div key={a.id}>
                {a.name}
                {a.url && (
                  <span> (<a href={a.url} target="_blank" rel="noopener noreferrer" className="underline">Website</a>)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Upcoming Departures section */}
      <div className="bg-blue-50 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
            🚍 Upcoming Departures
          </h4>
          {scheduleQuery.isError && <RetryButton onRetry={() => scheduleQuery.refetch()} />}
        </div>
        {scheduleQuery.isSuccess && (
          <div className="space-y-2">
            {arrivals.length > 0 ? (
              arrivals.slice(0, 5).map((arrival: ObaArrivalDeparture, idx: number) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full flex justify-between items-center text-sm py-1"
                  onClick={async () => {
                    // Ensure sidebar is open to transit pane
                    if (typeof window !== 'undefined' && (window as any).openSidebarPane) {
                      (window as any).openSidebarPane('transit');
                    }
                    // Proceed with normal route switch
                    await handleRouteSwitch(arrival.routeId);
                  }}
                >
                  <span className="font-medium">Route {arrival.routeShortName}</span>
                  <div className="flex items-baseline space-x-1">
                    <span>{new Date(arrival.scheduledArrivalTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="text-xs text-gray-600">({formatArrivalTime(arrival.predictedArrivalTime, arrival.scheduledArrivalTime)})</span>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-xs text-blue-600">No arrivals scheduled</div>
            )}
          </div>
        )}
        {scheduleQuery.isError && (
          <div className="text-xs text-red-600">Error loading arrivals: {String(scheduleQuery.error)}</div>
        )}
      </div>
    </>
  );
};

// Hours Section: load opening hours & contact via OSM
export const HoursSection = ({ name, latitude, longitude }: { name: string; latitude: number; longitude: number }) => {
  const hoursQuery = useStopHours(name, latitude, longitude);

  if (!name) return null;
  return (
    <div className="rounded-md border border-green-300 p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-green-800 flex items-center gap-2">
          🕐 Hours & Contact
          {hoursQuery.isLoading && <Spinner />}
        </h5>
        {hoursQuery.isError && <RetryButton onRetry={() => hoursQuery.refetch()} />}
      </div>
      {hoursQuery.isSuccess && hoursQuery.data && (
        <div className="mt-1 space-y-2">
          {hoursQuery.data.opening_hours ? (
            (() => {
              const parsed = openingHoursParser.parseOpeningHours(hoursQuery.data!.opening_hours);
              if (!parsed.hasData) {
                return <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">No Hours Available</div>;
              }
              return (
                <div className="space-y-1">
                  <div className="bg-white border border-green-200 rounded overflow-hidden">
                    <table className="w-full text-xs"><tbody>
                      {parsed.schedule.map((day, idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-green-50' : 'bg-white'} border-b border-green-100 last:border-b-0`}>
                          <td className="py-1.5 px-2 font-medium text-green-900 w-20">{day.fullDay}</td>
                          <td className={`py-1.5 px-2 ${day.isClosed ? 'status-closed' : 'status-open'}`}>{day.hours}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                  {parsed.notes && <div className="text-xs text-amber-600 bg-amber-50 p-1.5 rounded">{parsed.notes}</div>}
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">No Hours Available</div>
          )}
          {(hoursQuery.data.phone || hoursQuery.data.website) && (
            <div className="space-y-0.5">
              {hoursQuery.data.phone && <p className="text-xs">📞 {hoursQuery.data.phone}</p>}
              {hoursQuery.data.website && <p className="text-xs">🌐 <a href={hoursQuery.data.website} target="_blank" rel="noopener noreferrer" className="underline">Website</a></p>}
            </div>
          )}
          {hoursQuery.data.operator && <p className="text-xs text-green-600">Operated by {hoursQuery.data.operator}</p>}
        </div>
      )}
      {hoursQuery.isError && <p className="text-xs text-red-600 mt-1">Error loading hours: {String(hoursQuery.error)}</p>}
    </div>
  );
};

// Nearby Section: fetch and display OSM POIs around given coords
export const NearbySection = ({ latitude, longitude, radius = 200 }: { latitude: number; longitude: number; radius?: number }) => {
  const nearbyQuery = useNearbyOSM(latitude, longitude, radius);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-800 flex items-center gap-2">
          📍 Nearby Places
          {nearbyQuery.isLoading && <Spinner />}
        </h5>
        {nearbyQuery.isError && <RetryButton onRetry={() => nearbyQuery.refetch()} />}
      </div>
      {nearbyQuery.isSuccess && (
        <div className="space-y-2">
          {nearbyQuery.data.length > 0 ? (
            <>
              <p className="text-xs text-gray-600">{nearbyQuery.data.length} places within {radius}m</p>
              {nearbyQuery.data.map((poi, idx) => (
                <div key={idx} className="bg-white rounded p-2 border border-gray-100">
                  <div className="text-sm font-medium text-gray-700">
                    {poi.name ?? poi.category ?? 'Unknown'}
                  </div>
                  {poi.subclass && <div className="text-xs text-gray-500">{poi.subclass}</div>}
                </div>
              ))}
            </>
          ) : (
            <div className="text-xs text-gray-600">No nearby places found</div>
          )}
        </div>
      )}
      {nearbyQuery.isError && (
        <div className="text-xs text-red-600">Error loading nearby places: {String(nearbyQuery.error)}</div>
      )}
    </div>
  );
};

// Photos Section
export const PhotosSection = ({ section, onRetry }: SectionProps<PhotosSectionData>) => {
  if (section.status === 'idle') return null;
  
  return (
    <div className="border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-800 flex items-center gap-2">
          📸 Photos
          {section.status === 'loading' && <Spinner />}
        </h5>
        {section.status === 'error' && onRetry && <RetryButton onRetry={onRetry} />}
      </div>
      
      {section.status === 'success' && section.data && (
        <div className="space-y-2">
          {section.data.photos?.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {section.data.photos.slice(0, 2).map((photo: any, index: number) => (
                <div key={index} className="relative">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-20 object-cover rounded border"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                    {photo.attribution}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No photos available</p>
          )}
        </div>
      )}
      
      {section.status === 'error' && (
        <p className="text-xs text-red-600">Unable to load photos: {section.error}</p>
      )}
    </div>
  );
};

// Actions Section
export const ActionsSection = ({ poi, onDirections, onSave }: { poi: any; onDirections?: (poi: any) => void; onSave?: (poi: any) => void; }) => {
  const poiStore = usePlaceStore();
  const isSaved = React.useMemo(() => Boolean(poi.id && poiStore.getStoredPlace(poi.id)), [poi, poiStore]);
  const { toast } = useToast();
  
  const handleSave = React.useCallback(() => {
    if (!poi || isSaved) return;
    poiStore.addStoredPlace({ ...poi, id: `stored-${Date.now()}`, properties: { ...poi.properties, savedAt: Date.now() } });
    onSave?.(poi);
  }, [poi, isSaved, poiStore, onSave]);
  
  const handleShare = React.useCallback(() => {
    const text = poi.description ? formatAddressLines(poi.description).join('\n') : window.location.href;
    navigator.clipboard?.writeText(text).then(() => toast({ title: 'Copied to clipboard' })).catch(() => toast({ title: 'Copied to clipboard' }));
  }, [poi.description, toast]);
  
  return (
    <div className="flex items-center space-x-2 pt-1">
      {onDirections && (
        <Button variant="ghost" size="icon" onClick={() => onDirections(poi)}>
          <Navigation className="h-4 w-4" />
        </Button>
      )}
      {onSave && (
        <Button variant={isSaved ? 'default' : 'ghost'} size="icon" onClick={handleSave}>
          <Heart className={`h-4 w-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={handleShare}>
        <Share className="h-4 w-4" />
      </Button>
    </div>
  );
}; 
