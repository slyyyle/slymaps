import React from 'react';
import { openingHoursParser } from '@/services/opening-hours-parser';

interface OSMHoursTableProps {
  opening_hours?: string;
  isLoading?: boolean;
  hasError?: boolean;
  error?: string;
  onRetry?: () => void;
  contentOnly?: boolean; // When true, only render the table content without header/wrapper
}

export const OSMHoursTable: React.FC<OSMHoursTableProps> = ({
  opening_hours,
  isLoading = false,
  hasError = false,
  error,
  onRetry,
  contentOnly = false
}) => {
  // Don't render if no hours data and not loading/error
  if (!opening_hours && !isLoading && !hasError) {
    return (
      <div className="border-l-4 border-gray-300 pl-3 py-1">
        <h5 className="text-sm font-medium text-gray-600 flex items-center gap-2">
          🕐 Hours & Contact
        </h5>
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mt-1">
          No data available
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="border-l-4 border-green-300 pl-3 py-1">
        <h5 className="text-sm font-medium text-green-800 flex items-center gap-2">
          🕐 Hours & Contact
          <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
        </h5>
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-1">
          Loading hours...
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="border-l-4 border-red-300 pl-3 py-1">
        <h5 className="text-sm font-medium text-red-800 flex items-center gap-2">
          🕐 Hours & Contact
          {onRetry && (
            <button 
              onClick={onRetry}
              className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
            >
              Retry
            </button>
          )}
        </h5>
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
          {error || 'Unable to load hours'}
        </div>
      </div>
    );
  }

  // Parse hours data
  if (!opening_hours) {
    return (
      <div className="border-l-4 border-gray-300 pl-3 py-1">
        <h5 className="text-sm font-medium text-gray-600 flex items-center gap-2">
          🕐 Hours & Contact
        </h5>
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mt-1">
          No Hours Available
        </div>
      </div>
    );
  }

  const parsedHours = openingHoursParser.parseOpeningHours(opening_hours);

  if (!parsedHours.hasData) {
    if (contentOnly) {
      return (
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mt-1">
          No Hours Available
        </div>
      );
    }
    return (
      <div className="border-l-4 border-gray-300 pl-3 py-1">
        <h5 className="text-sm font-medium text-gray-600 flex items-center gap-2">
          🕐 Hours & Contact
        </h5>
        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mt-1">
          No Hours Available
        </div>
      </div>
    );
  }

  const tableContent = (
    <div className="mt-1 space-y-1">
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

  if (contentOnly) {
    return tableContent;
  }

  return (
    <div className="border-l-4 border-green-300 pl-3 py-1">
      <h5 className="text-sm font-medium text-green-800 flex items-center gap-2">
        🕐 Hours & Contact
      </h5>
      {tableContent}
    </div>
  );
}; 