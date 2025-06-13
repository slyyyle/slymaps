# POI Segregation Architecture

## Overview

This document outlines the segregated POI handling architecture designed to prevent lifecycle conflicts and infinite loops that were occurring with the previous mixed approach.

## Problem Statement

The original implementation suffered from several overlapping POI handling systems:

### 1. **Multiple Click Handlers Competing**
- Native Mapbox POI interactions (`addInteraction` API)
- React Marker onClick events 
- Enhanced interaction handlers for special modes
- All competing for the same callback chain

### 2. **Mixed State Management**
- Native POIs stored alongside user-created POIs
- Search results mixed with permanent POIs
- Ephemeral data treated as persistent
- Complex filtering logic with `isNativePoi`, `isSearchResult` flags

### 3. **Lifecycle Confusion**
- `useEffect` dependencies causing infinite loops
- Interdependent cleanup/setup cycles
- React Map GL v8 + Mapbox GL JS 3.12 lifecycle conflicts

## Solution: Segregated Architecture

### Component Structure

```
┌─────────────────────────────────────┐
│        useUnifiedPOIHandler         │ ← Single interface for map components
├─────────────────────────────────────┤
│    usePOIInteractionManager         │ ← Handles native interactions only
│    usePOIStore (segregated)         │ ← Manages persistent data only
└─────────────────────────────────────┘
```

## Data Segregation

### 1. **Native POIs (Ephemeral)**
- **Source**: Mapbox Standard Style featuresets
- **Handler**: `addInteraction` API only
- **Storage**: Never stored - purely ephemeral
- **Selection**: Temporary selection only for popup display
- **Lifecycle**: Created on click, destroyed on new selection

```typescript
// Example native POI
{
  id: "native-ephemeral-123-1671234567890",
  name: "Starbucks Coffee",
  type: "Coffee Shop", 
  isNativePoi: true,
  // Never persisted to store
}
```

### 2. **Search Result POIs (Temporary)**
- **Source**: Mapbox Search API
- **Handler**: React Markers with dedicated click handlers
- **Storage**: Temporary store with TTL (30min default)
- **Selection**: Can be selected and auto-promoted to stored
- **Lifecycle**: Auto-cleanup on expiration

```typescript
// Example search result POI
{
  id: "search_1671234567890_abc123",
  searchQuery: "coffee near me",
  retrievedAt: 1671234567890,
  isSearchResult: true,
  // Auto-expires after TTL
}
```

### 3. **Stored POIs (Persistent)**
- **Source**: Promoted search results, imported data
- **Handler**: React Markers with dedicated click handlers
- **Storage**: Permanent store with favorites, tags
- **Selection**: Full interaction with history tracking
- **Lifecycle**: User-managed (create/update/delete)

```typescript
// Example stored POI
{
  id: "poi_1671234567890_xyz789",
  createdAt: 1671234567890,
  lastAccessed: 1671234567890,
  isFavorite: true,
  tags: ["coffee", "work"],
  // Persisted indefinitely
}
```

### 4. **Created POIs (User-Generated)**
- **Source**: Manual user creation
- **Handler**: React Markers with dedicated click handlers  
- **Storage**: Permanent store with custom metadata
- **Selection**: Full interaction with customization
- **Lifecycle**: User-managed with custom fields

```typescript
// Example created POI
{
  id: "poi_1671234567890_custom123",
  createdAt: 1671234567890,
  customType: "Meeting Point",
  notes: "Front entrance by the fountain",
  color: "#ff6b35",
  icon: "meeting",
  // User-defined custom data
}
```

## Interaction Flow

### Native POI Interaction
```
User clicks native POI
↓
addInteraction handler triggers
↓
Create ephemeral POI object
↓
usePOIInteractionManager.handlePOIInteraction('native')
↓
usePOIStore.selectPOI(poi, 'native')
↓
Popup displays (no storage)
```

### Search Result Interaction
```
User searches for place
↓
API returns results
↓
useUnifiedPOIHandler.handleSearchResult()
↓
usePOIStore.addSearchResult()
↓
Auto-select for immediate display
↓
User can promote to stored or let expire
```

### Custom POI Creation
```
User enters POI creation mode
↓
Clicks on map
↓
useUnifiedPOIHandler.handlePOICreation()
↓
usePOIStore.addCreatedPOI()
↓
Auto-select new POI
```

## Key Benefits

### 1. **No More Infinite Loops**
- Native interactions isolated to single `useEffect`
- Store operations don't trigger interaction re-setup
- Clear separation of concerns

### 2. **Predictable State Management**
- Each POI type has dedicated storage
- Clear data flow patterns
- No mixed ephemeral/persistent data

### 3. **Enhanced Performance**
- Automatic cleanup of temporary data
- Efficient re-renders with proper dependencies
- Native interaction optimization

### 4. **Better UX**
- Immediate feedback for all POI types
- Smart promotion of search results to permanent storage
- Consistent interaction patterns

## Implementation Guide

### For Map Components

Use the unified handler for all POI operations:

```typescript
const poiHandler = useUnifiedPOIHandler({ 
  map: mapRef.current,
  enableNativeInteractions: true 
});

// Get POIs for rendering
const storedPOIs = poiHandler.getStoredPOIs();
const searchResults = poiHandler.getSearchResults();
const createdPOIs = poiHandler.getCreatedPOIs();

// Handle interactions
<Marker onClick={() => poiHandler.handleStoredPOIClick(poi)}>
<Marker onClick={() => poiHandler.handleSearchResultClick(poi)}>
<Marker onClick={() => poiHandler.handleCreatedPOIClick(poi)}>
```

### For Search Components

```typescript
// Handle search results
const handleSearchRetrieve = (result) => {
  poiHandler.handleSearchResult(result.features[0], searchQuery);
};

// Promote search result to permanent storage
const handleSavePlace = (searchResultId) => {
  poiHandler.promoteSearchResultToStored(searchResultId);
};
```

### For POI Creation

```typescript
// Start POI creation mode
const handleCreatePOI = () => {
  // Use existing location state hook
  locationState.startPOICreation();
};

// Handle map click in creation mode
const handleMapClick = (coordinates) => {
  if (locationState.isCreatingPOI) {
    poiHandler.handlePOICreation(coordinates, {
      name: 'My Custom Place',
      type: 'Personal'
    });
  }
};
```

## Migration Notes

### Breaking Changes
- `onSelectPoi` callback now receives POI type information
- POI objects have type-specific interfaces
- Store methods renamed for clarity

### Backward Compatibility
- `getAllPOIs()` still returns combined view for existing UI
- POI selection events maintain same structure
- Existing POI data can be imported via `importData()`

## Best Practices

### 1. **Never Store Native POIs**
Native POIs should remain ephemeral - they're managed by Mapbox and change with map style updates.

### 2. **Auto-cleanup Search Results**
Search results should have reasonable TTL to prevent memory bloat.

### 3. **Use Type-Specific Handlers**
Always use the correct click handler for each POI type to maintain segregation.

### 4. **Promote Valuable Search Results**
Provide UI to promote search results to permanent storage when users want to save them.

### 5. **Monitor Performance**
Use the store's cleanup methods to maintain performance as POI collections grow.

## Troubleshooting

### "Infinite Loop" Issues
- Check that native interactions aren't being re-setup on every render
- Ensure store operations don't trigger map effect dependencies
- Verify POI type segregation is being maintained

### "Missing POIs" Issues  
- Check if search results have expired (TTL)
- Verify correct POI type is being queried
- Ensure native interactions are enabled if expecting native POIs

### "Performance" Issues
- Use `store.cleanup()` to remove expired data
- Check for memory leaks in ephemeral POI creation
- Monitor React Markers render frequency 