/**
 * Time formatting and transit status utilities for the application
 */

/**
 * Formats OneBusAway epoch time to a readable time string
 * @param epochTime - Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "2:30 PM") or "N/A" if invalid
 */
export const formatObaTime = (epochTime: number | null | undefined): string => {
  if (!epochTime) return 'N/A';
  return new Date(epochTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Gets the current time-based lighting preset based on hour of day
 * @returns The appropriate lighting preset for the current time
 */
export const getTimeBasedLightingPreset = (): 'day' | 'dusk' | 'dawn' | 'night' => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
};

/**
 * Gets the appropriate CSS class for transit status indicators
 * @param status - The transit status string
 * @returns CSS class for the status color
 */
export const getStatusColor = (status?: string): string => {
  if (!status) return "bg-gray-500";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("scheduled") || statusLower.includes("on_time")) return "bg-green-500";
  if (statusLower.includes("delayed")) return "bg-orange-500";
  if (statusLower.includes("canceled")) return "bg-red-500";
  return "bg-yellow-500";
}; 