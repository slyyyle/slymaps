import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Navigation, Heart, Share } from 'lucide-react';
import type { PopupSection, TransitSectionData, HoursSectionData, PhotosSectionData, NearbySectionData } from '@/types/popup';
import { openingHoursParser } from '@/services/opening-hours-parser';
import { usePOIStore } from '@/stores/use-poi-store';
import type { SearchResultPOI } from '@/stores/use-poi-store';
import { useToast } from '@/hooks/ui/use-toast';
import { formatAddressLines } from '@/utils/address-utils';

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

// Transit Section
export const TransitSection = ({ section, onRetry }: SectionProps<TransitSectionData>) => {
  if (section.status === 'idle') return null;
  
  return (
          <div className="bg-blue-50 rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
          🚌 Nearby Transit
          {section.status === 'loading' && <Spinner />}
        </h4>
        {section.status === 'error' && onRetry && <RetryButton onRetry={onRetry} />}
      </div>
      
      {section.status === 'success' && section.data && (
        <div className="space-y-2">
          {section.data.stopArrivals?.length > 0 ? (
            section.data.stopArrivals.map((stopData: any) => (
              <div key={stopData.stop.id} className="bg-white rounded p-2">
                <div className="text-xs font-medium text-blue-800">{stopData.stop.name}</div>
                <div className="text-xs text-blue-600 mb-1">{Math.round(stopData.stop.distance || 0)}m away</div>
                {stopData.arrivals?.length > 0 ? (
                  <div className="space-y-1">
                    {stopData.arrivals.slice(0, 2).map((arrival: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-medium">Route {arrival.routeShortName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          arrival.predictedArrivalTime ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatArrivalTime(arrival.predictedArrivalTime, arrival.scheduledArrivalTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No arrivals scheduled</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-blue-600">No transit stops found within 500m</div>
          )}
        </div>
      )}
      
      {section.status === 'error' && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          Unable to load transit info: {section.error}
        </div>
      )}
    </div>
  );
};

// Hours Section  
export const HoursSection = ({ section, onRetry }: SectionProps<HoursSectionData>) => {
  if (section.status === 'idle') return null;
  
  return (
    <div className="border-l-4 border-green-300 pl-3 py-1">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-green-800 flex items-center gap-2">
          🕐 Hours & Contact
          {section.status === 'loading' && <Spinner />}
        </h5>
        {section.status === 'error' && onRetry && <RetryButton onRetry={onRetry} />}
      </div>
      
      {section.status === 'success' && section.data && (
        <div className="mt-1 space-y-2">
          {/* Hours Table */}
          {section.data.opening_hours ? (
            (() => {
              const parsedHours = openingHoursParser.parseOpeningHours(section.data.opening_hours);
              
              if (!parsedHours.hasData) {
                return (
                  <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                    No Hours Available
                  </div>
                );
              }

              return (
                <div className="space-y-1">
                  <div className="bg-white border border-green-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        {parsedHours.schedule.map((dayHours, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? 'bg-green-50' : 'bg-white'} border-b border-green-100 last:border-b-0`}>
                            <td className="py-1.5 px-2 font-medium text-green-900 w-20">
                              {dayHours.fullDay}
                            </td>
                            <td className={`py-1.5 px-2 ${dayHours.isClosed ? 'text-red-600' : 'text-green-700'}`}>
                              {dayHours.hours}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedHours.notes && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-1.5 rounded">
                      {parsedHours.notes}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
              No Hours Available
            </div>
          )}

          {/* Contact Information */}
          {(section.data.phone || section.data.website) && (
            <div className="space-y-0.5">
              {section.data.phone && <p className="text-xs text-green-700">📞 {section.data.phone}</p>}
              {section.data.website && (
                <p className="text-xs text-green-700">
                  🌐 <a href={section.data.website} target="_blank" rel="noopener noreferrer" className="underline">
                    Website
                  </a>
                </p>
              )}
            </div>
          )}
          
          {/* Business Information */}
          {section.data.operator && <p className="text-xs text-green-600">Operated by {section.data.operator}</p>}
          <p className="text-xs text-gray-500">Source: {section.data.source === 'osm' ? 'OpenStreetMap' : 'POI Data'}</p>
        </div>
      )}
      
      {section.status === 'success' && !section.data && (
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mt-1">
          No Hours Available
        </div>
      )}
      
      {section.status === 'error' && (
        <p className="text-xs text-red-600 mt-1">Unable to load hours: {section.error}</p>
      )}
    </div>
  );
};

// Nearby Section
export const NearbySection = ({ section, onRetry }: SectionProps<NearbySectionData>) => {
  if (section.status === 'idle') return null;
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-800 flex items-center gap-2">
          📍 Nearby Places
          {section.status === 'loading' && <Spinner />}
        </h5>
        {section.status === 'error' && onRetry && <RetryButton onRetry={onRetry} />}
      </div>
      
      {section.status === 'success' && section.data && (
        <div className="space-y-2">
          {section.data.total > 0 ? (
            <>
              <p className="text-xs text-gray-600">{section.data.total} places within 200m</p>
              {section.data.topCategories?.map(([category, pois]: [string, any[]]) => (
                <div key={category} className="bg-white rounded p-2 border border-gray-100">
                  <div className="text-xs font-medium text-gray-700 capitalize mb-1">
                    {category.replace('_', ' ')} ({pois.length})
                  </div>
                  <div className="text-xs text-gray-600">
                    {pois.slice(0, 2).map(poi => poi.name).join(', ')}
                    {pois.length > 2 && ` +${pois.length - 2} more`}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-gray-500">No nearby places found within 200m</p>
          )}
        </div>
      )}
      
      {section.status === 'error' && (
        <p className="text-xs text-red-600">Unable to load nearby places: {section.error}</p>
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
export const ActionsSection = ({ 
  poi, 
  onDirections, 
  onSave 
}: { 
  poi: any; 
  onDirections?: (poi: any) => void; 
  onSave?: (poi: any) => void; 
}) => {
  const { toast } = useToast();
  const poiStore = usePOIStore();
  
  const isSaved = React.useMemo(() => {
    if (poi.id && poiStore.getStoredPOI(poi.id)) {
      return true;
    }
    return false;
  }, [poi, poiStore]);

  const handleSave = React.useCallback(() => {
    if (!poi || isSaved) return;
    
    const storedPoi = {
      id: `stored-${Date.now()}`,
      name: poi.name,
      type: poi.type || 'poi',
      latitude: poi.latitude,
      longitude: poi.longitude,
      description: poi.description || '',
      properties: {
        ...poi.properties,
        address: poi.properties?.address || poi.description || '',
        savedAt: Date.now()
      }
    };
    
    poiStore.addStoredPOI(storedPoi);
    
    if (onSave) {
      onSave(poi);
    }
  }, [poi, isSaved, poiStore, onSave]);

  // Fallback copy for unsupported browsers
  const fallbackCopy = React.useCallback((text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast({ title: 'Copied to clipboard' });
  }, [toast]);

  const handleShare = React.useCallback(() => {
    const text = poi.description
      ? formatAddressLines(poi.description).join('\n')
      : window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast({ title: 'Copied to clipboard' }))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }, [poi.description, toast, fallbackCopy]);

  return (
    <div className="border-t border-gray-200 pt-3 flex gap-2">
      {onDirections && (
        <Button variant="outline" size="sm" onClick={() => onDirections(poi)} className="flex-1 text-xs">
          <Navigation className="h-3 w-3 mr-1" />
          Directions
        </Button>
      )}
      {onSave && (
        <Button 
          variant={isSaved ? "default" : "outline"} 
          size="sm" 
          onClick={handleSave} 
          className={`flex-1 text-xs ${isSaved ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
        >
          <Heart className={`h-3 w-3 mr-1 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="flex-1 text-xs"
      >
        <Share className="h-3 w-3 mr-1" />
        Share
      </Button>
    </div>
  );
}; 