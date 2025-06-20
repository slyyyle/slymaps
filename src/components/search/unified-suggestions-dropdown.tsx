import React from 'react';
import { Icons } from '@/components/icons';
import type { UnifiedSearchSuggestion } from '@/types/transit/oba';

interface UnifiedSuggestionsDropdownProps {
  show: boolean;
  isLoading: boolean;
  suggestions: UnifiedSearchSuggestion[];
  onSelect: (suggestion: UnifiedSearchSuggestion) => void;
}

export function UnifiedSuggestionsDropdown({
  show,
  isLoading,
  suggestions,
  onSelect,
}: UnifiedSuggestionsDropdownProps) {
  if (!show) return null;

  return (
    <div 
      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border shadow-lg overflow-y-auto"
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
        borderColor: 'hsl(var(--sidebar-border))',
        backdropFilter: 'blur(12px)',
        color: 'hsl(var(--sidebar-foreground))',
      }}
    >
      {isLoading ? (
        <div className="p-4 text-center">
          <Icons.Time 
            className="h-4 w-4 animate-spin mx-auto mb-2" 
            style={{ color: 'hsl(var(--sidebar-accent))' }}
          />
          <p 
            className="text-sm"
            style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
          >
            Searching...
          </p>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="p-1">
          <div 
            className="px-2 py-1.5 text-xs font-medium"
            style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
          >
            {suggestions.some(s => s.type === 'place') && suggestions.some(s => s.type !== 'place') 
              ? 'Places & Transit' 
              : suggestions.some(s => s.type === 'place') 
                ? 'Places' 
                : 'Transit Options'}
          </div>
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(suggestion);
              }}
              onClick={(e) => e.preventDefault()}
              className="w-full flex items-center gap-2 p-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-sm transition-colors"
              style={{
                color: 'hsl(var(--sidebar-foreground))',
              }}
            >
              {suggestion.type === 'route' ? (
                <Icons.Route 
                  className="h-4 w-4 flex-shrink-0" 
                  style={{ color: 'hsl(var(--sidebar-accent))' }}
                />
              ) : suggestion.type === 'place' ? (
                <Icons.MapPin 
                  className="h-4 w-4 flex-shrink-0" 
                  style={{ color: 'hsl(var(--sidebar-accent))' }}
                />
              ) : (
                <Icons.MapPin 
                  className="h-4 w-4 flex-shrink-0" 
                  style={{ color: 'hsl(var(--sidebar-accent))' }}
                />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span 
                  className="font-medium truncate"
                  style={{ color: 'hsl(var(--sidebar-foreground))' }}
                >
                  {suggestion.title}
                </span>
                {suggestion.subtitle && (
                  <span 
                    className="text-xs truncate"
                    style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}
                  >
                    {suggestion.subtitle}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
} 