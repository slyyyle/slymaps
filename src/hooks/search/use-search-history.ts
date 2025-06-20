import { useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

// Key for localStorage and React Query cache
const SEARCH_HISTORY_KEY = 'search-history';

// Load history from localStorage
function loadHistory(): Array<{ query: string; metadata?: any; timestamp: number }> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save history to localStorage
function saveHistory(history: Array<{ query: string; metadata?: any; timestamp: number }>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore write errors
  }
}

/**
 * Hook to record and retrieve user search history.
 * Stores entries in localStorage and caches via React Query.
 */
export function useSearchHistory() {
  const queryClient = useQueryClient();

  // Reactive query for history
  const { data: history = [] } = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => loadHistory(),
    staleTime: Infinity,
  });

  // Mutation to add a new history entry
  const addEntry = useMutation({
    mutationFn: async ({ query, metadata }: { query: string; metadata?: any }) => {
      const timestamp = Date.now();
      const existing = loadHistory();
      const filtered = existing.filter(entry => entry.query !== query);
      const updated = [{ query, metadata, timestamp }, ...filtered].slice(0, 50);
      saveHistory(updated);
      queryClient.setQueryData(['searchHistory'], updated);
      return updated;
    },
  });

  // Mutation to clear history
  const clearHistory = useMutation({
    mutationFn: async () => {
      saveHistory([]);
      queryClient.setQueryData(['searchHistory'], []);
      return [];
    },
  });

  return {
    history,
    addSearchHistory: ({ query, metadata }: { query: string; metadata?: any }) => addEntry.mutate({ query, metadata }),
    clearSearchHistory: () => clearHistory.mutate(),
  };
} 