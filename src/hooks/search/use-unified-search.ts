import { useState, useCallback } from 'react';
import { getSearchSuggestions } from '@/services/oba';
import type { Coordinates } from '@/types/core';
import type { UnifiedSearchSuggestion } from '@/types/oba';

interface UseUnifiedSearchOptions {
  currentLocation?: Coordinates;
}

export function useUnifiedSearch({ currentLocation }: UseUnifiedSearchOptions) {
  const [unifiedSuggestions, setUnifiedSuggestions] = useState<UnifiedSearchSuggestion[]>([]);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [isLoadingUnified, setIsLoadingUnified] = useState(false);

  // Helper function to determine if a query is likely for transit
  const isLikelyTransitQuery = useCallback((query: string): boolean => {
    const trimmedQuery = query.trim().toLowerCase();
    
    // Don't search transit for very short queries
    if (trimmedQuery.length < 2) return false;
    
    // Transit-specific keywords
    const transitKeywords = [
      'bus', 'route', 'stop', 'station', 'transit', 'line'
    ];
    
    // Check for explicit transit keywords
    if (transitKeywords.some(keyword => trimmedQuery.includes(keyword))) return true;
    
    // Simple route number pattern (1-3 digits)
    if (/^(route\s*|line\s*|bus\s*)?(\d{1,3}[a-z]?)$/i.test(trimmedQuery)) return true;
    
    // Check for stop codes (5-6 digits)
    if (/^\d{5,6}$/.test(trimmedQuery)) return true;
    
    // Don't search transit for address-like queries
    if (/^\d+\s/.test(trimmedQuery)) return false;
    
    return false;
  }, []);

  // Smart search - search OBA transit sources for transit-like queries
  const searchOBA = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUnifiedSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    // Only search OBA for transit-like queries to prevent resource not found errors
    const isTransitQuery = isLikelyTransitQuery(query);
    console.log(`🔍 Query "${query}" is ${isTransitQuery ? 'transit-like' : 'place-like'} - ${isTransitQuery ? 'searching OBA' : 'skipping OBA'}`);
    
    if (!isTransitQuery) {
      setUnifiedSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    setIsLoadingUnified(true);
    try {
      const suggestions = await getSearchSuggestions(query, currentLocation);
      setUnifiedSuggestions(suggestions);
      setShowSuggestionsDropdown(suggestions.length > 0);
    } catch (error) {
      // Handle 404 errors silently (resource not found is expected for many queries)
      if (error instanceof Error && error.message.includes('resource not found')) {
        console.log(`ℹ️ No transit results found for "${query}" (expected for non-transit queries)`);
      } else {
        console.error('OBA search error:', error);
      }
      setUnifiedSuggestions([]);
      setShowSuggestionsDropdown(false);
    }
    setIsLoadingUnified(false);
  }, [currentLocation, isLikelyTransitQuery]);

  const clearSearchResults = useCallback(() => {
    setUnifiedSuggestions([]);
    setShowSuggestionsDropdown(false);
  }, []);

  return {
    unifiedSuggestions,
    showSuggestionsDropdown,
    isLoadingUnified,
    searchOBA,
    clearSearchResults,
    isLikelyTransitQuery,
  };
} 