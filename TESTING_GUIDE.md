
### Seattle Transit Compass: Functionality & Testing Guide

This document outlines the current features of the Seattle Transit Compass application, focusing on what has been implemented through Phase 1 and the current state of Phase 2 of the OneBusAway integration. It serves as a guide for systematic testing and future cleanup/refinement.

---

**I. Core Map & UI Features**

1.  **Map Display & Interaction:**
    *   [ ] Map initializes to Capitol Hill, Seattle.
    *   [ ] User can pan and zoom the map.
    *   [ ] Map controls (Zoom, Fullscreen, Geolocate) are functional.
    *   [ ] 3D buildings are displayed at appropriate zoom levels.
    *   [ ] Map style can be changed via the "Map Style" section in the sidebar.
        *   [ ] All listed styles load correctly.
2.  **Sidebar Functionality:**
    *   [ ] Sidebar can be opened and closed using the menu icon.
    *   [ ] Sidebar sections (Directions, OneBusAway Explorer, Custom POIs, Map Style) are collapsible accordions.
    *   [ ] Accordion sections expand and collapse correctly.
    *   [ ] Sidebar content is scrollable if it exceeds available height.
3.  **Initial Points of Interest (POIs):**
    *   [ ] Initial POIs (Oddfellows, Neumos, etc.) are displayed on the map with appropriate icons.
    *   [ ] Clicking an initial POI marker:
        *   [ ] Opens a popup with its name, type, description, and image.
        *   [ ] Map flies to the POI.
4.  **Custom POIs:**
    *   [ ] User can add a new custom POI via the "Custom POIs" section in the sidebar.
        *   [ ] Dialog opens for adding.
        *   [ ] Name, Type, Latitude, Longitude fields are validated.
        *   [ ] Address and Description are optional.
        *   [ ] POI is added to the map and the list in the sidebar.
        *   [ ] Toast notification confirms addition.
    *   [ ] User can edit an existing custom POI.
        *   [ ] Dialog opens pre-filled with POI data.
        *   [ ] Updates are reflected on the map and in the list.
        *   [ ] Toast notification confirms update.
    *   [ ] User can delete a custom POI.
        *   [ ] POI is removed from the map and the list.
        *   [ ] Toast notification confirms deletion.
    *   [ ] Clicking a custom POI from the list in the sidebar selects it on the map and flies to it.
5.  **Main Search Bar (Top of Screen):**
    *   [ ] User can search for an address.
    *   [ ] Selecting a search result flies the map to the location and sets it as the `destination` for the Directions Form.
    *   [ ] Search input can be cleared using the 'X' button.
    *   [ ] Clearing the search clears the `destination` and any displayed routes.
6.  **Directions Functionality:**
    *   [ ] **Directions Form (Sidebar):**
        *   [ ] **Start Location:**
            *   [ ] Defaults to "Manual" input.
            *   [ ] Can switch to "GPS" mode.
                *   [ ] GPS mode attempts to get current location and updates start coordinates.
                *   [ ] Toast notification for GPS success/failure.
            *   [ ] "Manual" mode allows address input via Mapbox AddressAutofill.
                *   [ ] Selecting an address sets start coordinates and flies to location.
        *   [ ] **Destination:**
            *   [ ] Uses Mapbox AddressAutofill.
            *   [ ] Can be pre-filled if a destination was set via the main search bar or map click.
            *   [ ] Selecting an address sets destination coordinates and flies to location.
        *   [ ] **Transit Mode:**
            *   [ ] Defaults to "Walking".
            *   [ ] User can select other modes (Driving, Cycling).
        *   [ ] **Get Directions Button:**
            *   [ ] Triggers fetching directions from Mapbox.
            *   [ ] Displays a loading indicator while fetching.
            *   [ ] If successful:
                *   [ ] A route is drawn on the map (accent color line).
                *   [ ] "Route Details" card appears below the form with duration, distance, and turn-by-turn steps.
                *   [ ] Map zooms/pans to fit the route.
                *   [ ] Clears any existing OneBusAway route path.
            *   [ ] If unsuccessful:
                *   [ ] Toast notification explains the error.
7.  **Error Handling & Toasts:**
    *   [ ] Toast notifications appear for:
        *   [ ] Missing API keys (Mapbox, OneBusAway - initial setup).
        *   [ ] API call failures (OBA stops, arrivals, route path).
        *   [ ] Directions failures.
        *   [ ] GPS location errors.
        *   [ ] Custom POI operations (add, update, delete).
    *   [ ] Components display appropriate messages if API keys are missing (e.g., SearchBar, DirectionsForm, OneBusAwayExplorer).

---

**II. OneBusAway Integration**

**Phase 1: Basic Stop & Arrival Information (COMPLETED)**

1.  **Automatic Stop Fetching & Display:**
    *   [ ] As the user pans/zooms the map, OneBusAway stops are fetched for the visible area (when map is idle).
    *   [ ] Fetched OBA stops are displayed on the map with a bus icon.
    *   [ ] Stops are not fetched if map is zoomed out too far.
    *   [ ] Check for error handling if OBA `stops-for-location` API call fails.
2.  **Map Popup for OBA Stops:**
    *   [ ] Clicking an OBA stop marker on the map:
        *   [ ] Opens a popup.
        *   [ ] Popup displays stop name, code, and direction.
        *   [ ] Popup shows a loading indicator for arrivals.
        *   [ ] Real-time arrivals are fetched and displayed in the popup:
            *   [ ] Route Short Name (as a clickable badge - *leads to Phase 2 functionality*).
            *   [ ] Trip Headsign.
            *   [ ] Predicted arrival time (if available, in accent color) or scheduled time.
            *   [ ] Status indicator (colored dot).
        *   [ ] If no arrivals, an appropriate message is shown.
        *   [ ] Check for error handling if OBA `arrivals-and-departures-for-stop` API call fails.
3.  **Sidebar "OneBusAway Explorer" - Stop View:**
    *   [ ] When an OBA stop is selected on the map:
        *   [ ] The "OneBusAway Explorer" section updates.
        *   [ ] Displays the selected stop's name, code, and direction.
        *   [ ] Shows a loading state for arrivals (skeletons).
        *   [ ] Lists real-time arrivals with details:
            *   [ ] Clickable Route Short Name badge (as a button - *leads to Phase 2 functionality*).
            *   [ ] Trip Headsign.
            *   [ ] Predicted/Scheduled times and status.
            *   [ ] Additional details like "Scheduled", "Status", "Vehicle ID" if available.
        *   [ ] If no OBA stop is selected, a message prompts the user to select one.
        *   [ ] If no arrivals, an appropriate message is shown.

**Phase 2: Route Exploration (COMPLETED - Core Features)**

1.  **Display Route Path on Map (from Arrivals List):**
    *   [ ] In the map popup's arrival list, clicking a route short name badge:
        *   [ ] Triggers fetching of the route's path (polylines) using OBA `stops-for-route`.
        *   [ ] A loading indicator is shown in the "OneBusAway Explorer" section in the sidebar.
        *   [ ] The route's path is decoded and drawn on the map (dashed blue line).
        *   [ ] Any existing Mapbox directions route is cleared.
        *   [ ] Map flies to the start of the route path.
    *   [ ] In the "OneBusAway Explorer" sidebar's arrival list, clicking a route short name button:
        *   [ ] Same behavior as above (fetches and draws route path).
2.  **Sidebar "OneBusAway Explorer" - Route View:**
    *   [ ] When a route path is successfully fetched and displayed on the map (either from arrivals list or direct search):
        *   [ ] The "OneBusAway Explorer" section updates to show "Route Details".
        *   [ ] Displays the selected route's short name and description.
        *   [ ] Lists all stops for that route in a scrollable list.
        *   [ ] Each stop in the list is a button.
        *   [ ] Clicking a stop button in this list:
            *   [ ] Selects that stop on the map (its marker should highlight).
            *   [ ] Map flies to that stop.
            *   [ ] The map popup for that stop appears.
            *   [ ] Real-time arrivals for *that newly selected stop* are fetched and displayed in its popup and in the sidebar (which should switch back to "Real-Time Arrivals" view for that stop).
    *   [ ] Check for error handling if OBA `stops-for-route` API call fails.
3.  **Direct Route Search in Sidebar:**
    *   [ ] "OneBusAway Explorer" has a "Find Route" card.
    *   [ ] User can input a OneBusAway Route ID (e.g., `1_100226`).
    *   [ ] Clicking "Show Route Path":
        *   [ ] Triggers fetching of the route's path and stops (using `stops-for-route`).
        *   [ ] Displays a loading indicator.
        *   [ ] If successful:
            *   [ ] Route path is drawn on the map.
            *   [ ] "Route Details" card in the sidebar is populated with the route's info and its stops.
            *   [ ] Map flies to the start of the route path.
        *   [ ] If unsuccessful (e.g., invalid ID, API error):
            *   [ ] A toast notification explains the error.
            *   [ ] Route details/path are not displayed or are cleared.

**Future for Phase 2 (Optional/Later):**

*   [ ] **(Optional/Later) Real-time Vehicle Locations:** Show vehicle icons on the map for a selected route.

**Phase 3: Enhanced Directions Integration (NOT YET STARTED)**

*   [ ] (Future) Deeper integration of OBA data into the Directions feature (as discussed previously).

---

This Markdown file (`TESTING_GUIDE.md`) is now notionally in your project root.
