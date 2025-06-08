# OneBusAway (OBA) Testing Guide

This guide provides a comprehensive testing plan for all OneBusAway functionality in SlyMaps. We'll test each feature systematically to ensure everything works properly.

## Prerequisites

Before starting the tests, ensure:
- OneBusAway API key is configured in your environment
- The application is running locally
- You have geolocation permissions enabled in your browser
- You're in the Seattle/King County Metro service area (or have access to test data)

## Testing Categories

### 1. Enhanced Search Bar Testing

#### Test 1.1: Basic Route Search
**Objective**: Test searching for routes by name/number
**Steps**:
1. Open the application
2. Click on the search bar
3. Type "40" (King County Metro Route 40)
4. **Expected**: Should show Route 40 in dropdown with agency info
5. Click on Route 40
6. **Expected**: Route should be drawn on map with stops displayed

**Variations to test**:
- Search "Link" for light rail
- Search "550" for express routes
- Search partial names like "Rapi" for RapidRide routes

#### Test 1.2: Stop Search
**Objective**: Test searching for transit stops
**Steps**:
1. Clear previous search
2. Type "Westlake" in search bar
3. **Expected**: Should show Westlake transit stops
4. Click on a Westlake stop
5. **Expected**: Map should fly to stop, show stop details and arrivals

**Variations**:
- Search by stop number: "10914"
- Search by landmark: "University District"
- Search incomplete names: "Pine"

#### Test 1.3: Location-Based Search
**Objective**: Test Mapbox place search integration
**Steps**:
1. Type "Pike Place Market"
2. **Expected**: Should show the market location
3. Click on it
4. **Expected**: Map should fly to location
5. Use "Get Directions" feature
6. **Expected**: Should show routing options

#### Test 1.4: Mixed Search Results
**Objective**: Test unified search combining places and transit
**Steps**:
1. Type "Capitol Hill"
2. **Expected**: Should show both:
   - Capitol Hill neighborhood (Mapbox result)
   - Capitol Hill Station (OBA stop)
   - Routes serving Capitol Hill (OBA routes)

### 2. Nearby Transit Discovery

#### Test 2.1: Geolocation-Based Discovery
**Objective**: Test nearby transit finder using current location
**Steps**:
1. Click the "📍" (nearby transit) button in search bar
2. Allow geolocation when prompted
3. **Expected**: 
   - Search bar shows "🔍 Finding nearby transit..."
   - Map shows nearby stops and routes
   - Sidebar shows "Nearby Transit" tab with results

#### Test 2.2: Manual Location Selection
**Objective**: Test nearby transit without geolocation
**Steps**:
1. If geolocation fails, manually click a location on the map
2. Use the nearby transit feature
3. **Expected**: Should work from clicked location

#### Test 2.3: No Results Handling
**Objective**: Test behavior in areas without transit
**Steps**:
1. Navigate map to a rural area outside Seattle
2. Try nearby transit discovery
3. **Expected**: Should gracefully handle no results

### 3. Route Visualization and Drawing

#### Test 3.1: Single Route Drawing
**Objective**: Test drawing individual routes on the map
**Steps**:
1. Search for "1" (Route 1)
2. Select Route 1 from dropdown
3. **Expected**:
   - Route path appears as blue dashed line on map
   - All stops for the route are visible
   - Map flies to route area
   - Route details appear in sidebar

#### Test 3.2: Route Colors and Styling
**Objective**: Test route visual representation
**Steps**:
1. Draw multiple routes: "40", "8", "D Line"
2. **Expected**:
   - Each route has appropriate visual styling
   - Lines don't overlap confusingly
   - Route colors match agency standards when available

#### Test 3.3: Complex Routes
**Objective**: Test routes with multiple segments
**Steps**:
1. Search for "Link Blue Line" or "1 Line"
2. Select the route
3. **Expected**:
   - Entire route path is drawn
   - All stations/stops are shown
   - Path includes tunnels and elevated sections

#### Test 3.4: Route Clearing
**Objective**: Test removing routes from map
**Steps**:
1. Draw a route
2. Use the clear button (X) in search bar
3. **Expected**: Route and stops disappear from map

### 4. Sidebar Integration

#### Test 4.1: Popular Routes Tab
**Objective**: Test popular routes display
**Steps**:
1. Open sidebar (hamburger menu)
2. Look at "Transit Browser" section
3. Click "Popular Routes" tab
4. **Expected**: Shows list of popular routes with colors and agencies
5. Click on a route
6. **Expected**: Route draws on map

#### Test 4.2: Nearby Transit Tab
**Objective**: Test nearby transit sidebar
**Steps**:
1. Use geolocation or manually select location
2. Check "Nearby Transit" tab in sidebar
3. **Expected**: 
   - Shows stops and routes near location
   - Displays distances
   - Click-to-select functionality works

#### Test 4.3: Stop Information Display
**Objective**: Test stop details in sidebar
**Steps**:
1. Click on a transit stop on the map
2. **Expected**:
   - Stop popup appears
   - Real-time arrivals shown (if available)
   - Routes serving the stop listed
   - "Get Directions" button works

### 5. Real-Time Data Testing

#### Test 5.1: Vehicle Locations
**Objective**: Test real-time vehicle tracking
**Steps**:
1. Search for an active route during service hours
2. Select the route
3. **Expected**:
   - Moving vehicle icons appear on route
   - Vehicles show direction and route info
   - Clicking vehicle shows details popup

#### Test 5.2: Arrival Predictions
**Objective**: Test stop arrival times
**Steps**:
1. Click on a busy transit stop
2. **Expected**:
   - Shows upcoming arrivals
   - Displays predicted vs scheduled times
   - Updates in real-time

#### Test 5.3: Service Alerts
**Objective**: Test transit alerts and disruptions
**Steps**:
1. Look for routes with service alerts
2. **Expected**: 
   - Alerts displayed in stop/route popups
   - Clear messaging about disruptions

### 6. Error Handling and Edge Cases

#### Test 6.1: API Failures
**Objective**: Test behavior when OBA API is unavailable
**Steps**:
1. Temporarily block OBA API in browser dev tools
2. Try transit searches
3. **Expected**: Graceful error messages, fallback to Mapbox search

#### Test 6.2: Invalid Route IDs
**Objective**: Test handling of non-existent routes
**Steps**:
1. Manually construct invalid route search
2. **Expected**: Clear error message, no crashes

#### Test 6.3: No Search Results
**Objective**: Test empty search results
**Steps**:
1. Search for non-existent terms like "xyzzyx"
2. **Expected**: "No results found" message

#### Test 6.4: Geolocation Denied
**Objective**: Test behavior when user denies location
**Steps**:
1. Deny geolocation permission
2. Try nearby transit
3. **Expected**: Fallback options or clear instructions

### 7. Performance Testing

#### Test 7.1: Large Route Loading
**Objective**: Test performance with complex routes
**Steps**:
1. Load multiple routes simultaneously
2. Monitor map performance
3. **Expected**: Smooth rendering, no lag

#### Test 7.2: Search Responsiveness
**Objective**: Test search performance
**Steps**:
1. Type rapidly in search bar
2. **Expected**: Debounced search, no duplicate requests

#### Test 7.3: Mobile Performance
**Objective**: Test on mobile devices
**Steps**:
1. Test on phone/tablet
2. **Expected**: Touch interactions work, good performance

### 8. Integration Testing

#### Test 8.1: Mapbox + OBA Integration
**Objective**: Test combined place and transit search
**Steps**:
1. Search for places near transit
2. Use directions from places to transit stops
3. **Expected**: Seamless integration between systems

#### Test 8.2: Multi-Modal Routing
**Objective**: Test routing with transit
**Steps**:
1. Get directions from location A to B
2. Try different transportation modes
3. **Expected**: Transit options integrated with walking/driving

### 9. User Experience Testing

#### Test 9.1: First-Time User Experience
**Objective**: Test ease of use for new users
**Steps**:
1. Clear all browser data
2. Open application fresh
3. Try to find transit without instructions
4. **Expected**: Intuitive interface, helpful hints

#### Test 9.2: Accessibility Testing
**Objective**: Test keyboard and screen reader access
**Steps**:
1. Navigate using only keyboard
2. Test with screen reader if available
3. **Expected**: All features accessible

### 10. Route Drawing Advanced Features

#### Test 10.1: Multiple Route Comparison
**Objective**: Test displaying multiple routes simultaneously
**Steps**:
1. Search and select "40"
2. Search and add "8" 
3. Search and add "D Line"
4. **Expected**: All routes visible with different colors/styles

#### Test 10.2: Route Segment Accuracy
**Objective**: Test route path accuracy
**Steps**:
1. Select a route you know well
2. Compare drawn path to actual route
3. **Expected**: Path accurately follows streets and transit infrastructure

#### Test 10.3: Stop Distribution
**Objective**: Test stop placement along routes
**Steps**:
1. Draw a route
2. Zoom in to see individual stops
3. **Expected**: Stops properly positioned along route path

## Testing Checklist

### Core Functionality
- [ ] Route search by name/number
- [ ] Stop search by name/code
- [ ] Location-based search
- [ ] Nearby transit discovery
- [ ] Route drawing on map
- [ ] Stop markers and popups
- [ ] Real-time vehicle locations
- [ ] Arrival predictions
- [ ] Sidebar integration

### User Interface
- [ ] Search bar autocomplete
- [ ] Clear/reset functionality
- [ ] Responsive design
- [ ] Map controls work
- [ ] Popups display correctly
- [ ] Loading states shown

### Error Handling
- [ ] API failures handled gracefully
- [ ] Invalid searches handled
- [ ] Network errors managed
- [ ] Geolocation issues addressed

### Performance
- [ ] Fast search responses
- [ ] Smooth map rendering
- [ ] No memory leaks
- [ ] Mobile optimization

## Known Issues to Watch For

1. **Polyline Decoding**: Watch for garbled route paths (escape character issues)
2. **Cross-Origin Issues**: Ensure OBA API calls work from all environments
3. **Rate Limiting**: Monitor for API rate limit errors
4. **Coordinate Conversion**: Verify lat/lng order in route geometry
5. **Time Zones**: Check that arrival times display correctly

## Reporting Issues

When reporting issues, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and device information
- Console error messages
- Screenshots if applicable

## Success Criteria

The OBA integration is successful when:
- Users can easily find transit routes and stops
- Route paths display accurately on the map
- Real-time data updates properly
- Search is fast and intuitive
- Error states are handled gracefully
- Mobile experience is smooth
- Integration with Mapbox is seamless

---

*This testing guide should be executed systematically, with each section completed before moving to the next. Document any issues found and verify fixes before proceeding.* 