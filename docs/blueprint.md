# **App Name**: Seattle Transit Compass

## Core Features:

- Interactive Map: Display an interactive map using Mapbox GL JS, centered on the Capitol Hill neighborhood of Seattle.
- Address Search and Autocomplete: Integrate Mapbox Searchbox to provide address search and location suggestions using search-js-web. Allow users to input a destination address or point of interest.
- Multi-Modal Directions: Display the user’s route, using Mapbox Directions. Show transit, walking and ferry directions powered by the OneBusAway Puget Sound API.
- Points of Interest: Use point of interest markers around the capitol hill seattle area such as restaurants, bars and venues, with corresponding details fetched from available APIs such as Yelp.
- Intelligent Transit Suggestions: Implement an AI-powered 'Transit Suggestion Tool' which leverages user's past routes to propose more appropriate transit based directions during specific hours and dates. The tool will propose better routes based on past choices.
- Custom 3D Layer: Implement a custom 3D layer leveraging advanced Mapbox features to enhance map visualization with 3D Seattle and elevation data.
- Style Toggling: Allow the user to toggle between their styles which they make easy to do with 1 command.
- Geolocation: Implement geolocation for mobile devices.
- Custom POIs: Allow users to set custom POIs like 'Home', 'Work', etc.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6) to evoke a sense of calm and exploration.
- Background color: Very light blue (#E3F2FD), for a clean, unobtrusive feel.
- Accent color: Soft orange (#FFB74D) to highlight transit options, routes, and points of interest, ensuring contrast and easy readability.
- Headline font: 'Space Grotesk' (sans-serif) for headlines and other short, important bits of text. Body font: 'Inter' (sans-serif) for body text and other readable contexts, especially those which require longer strings of text.
- Use clean, minimalist icons to represent different modes of transit and categories of POIs.
- A clean, map-centric design with a prominent search bar and unobtrusive UI elements for directions and POI selection.
- Subtle transitions and animations for map movements, route updates, and POI marker interactions.