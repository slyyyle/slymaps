import { renderHook, act } from '@testing-library/react';
import { useRouteNavigation } from '../use-route-navigation';
import type { Route, Coordinates, TransitMode } from '@/types';

// Mock the services
jest.mock('@/services/mapbox', () => ({
  getDirections: jest.fn(),
}));

jest.mock('@/services/oba', () => ({
  getRouteDetails: jest.fn(),
  getVehiclesForRoute: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  log: {
    route: jest.fn(),
    warning: jest.fn(),
    poi: jest.fn(),
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockMapboxService = require('@/services/mapbox');
const mockObaService = require('@/services/oba');

describe('useRouteNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useRouteNavigation());

    expect(result.current.route).toBeNull();
    expect(result.current.obaRouteGeometry).toBeNull();
    expect(result.current.currentOBARouteDisplayData).toBeNull();
    expect(result.current.obaVehicleLocations).toEqual([]);
    expect(result.current.destination).toBeNull();
    expect(result.current.routeStartCoords).toBeNull();
    expect(result.current.routeEndCoords).toBeNull();
    expect(result.current.showDirectionsPopup).toBe(false);
    expect(result.current.isLoadingRoute).toBe(false);
    expect(result.current.isLoadingObaRouteGeometry).toBe(false);
    expect(result.current.isLoadingObaVehicles).toBe(false);
  });

  it('should fetch directions successfully', async () => {
    const mockRoute: Route = {
      id: 'route-1',
      geometry: {
        type: 'LineString',
        coordinates: [[-122.4194, 37.7749], [-122.4094, 37.7849]],
      },
      legs: [{
        steps: [],
        summary: 'Test route',
        distance: 1000,
        duration: 300,
      }],
      distance: 1000,
      duration: 300,
    };

    mockMapboxService.getDirections.mockResolvedValue(mockRoute);

    const { result } = renderHook(() => useRouteNavigation());

    const start: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
    const end: Coordinates = { latitude: 37.7849, longitude: -122.4094 };
    const mode: TransitMode = 'driving-traffic';

    await act(async () => {
      await result.current.fetchDirections(start, end, mode);
    });

    expect(result.current.route).toEqual(mockRoute);
    expect(result.current.routeStartCoords).toEqual(start);
    expect(result.current.routeEndCoords).toEqual(end);
    expect(mockMapboxService.getDirections).toHaveBeenCalledWith(start, end, mode);
  });

  it('should handle directions fetch error', async () => {
    mockMapboxService.getDirections.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRouteNavigation());

    const start: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
    const end: Coordinates = { latitude: 37.7849, longitude: -122.4094 };
    const mode: TransitMode = 'driving-traffic';

    await act(async () => {
      await result.current.fetchDirections(start, end, mode);
    });

    expect(result.current.route).toBeNull();
    expect(result.current.routeStartCoords).toEqual(start);
    expect(result.current.routeEndCoords).toEqual(end);
  });

  it('should handle OBA route selection', async () => {
    const mockRouteDetails = {
      routeGeometry: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[-122.4194, 37.7749], [-122.4094, 37.7849]],
        },
        properties: { routeId: 'oba-route-1' },
      },
      routeInfo: {
        id: 'oba-route-1',
        shortName: '1',
        longName: 'Metro Route 1',
        agencyId: 'agency-1',
      },
      stops: [
        {
          id: 'stop-1',
          name: 'Test Stop',
          type: 'Bus Stop',
          latitude: 37.7749,
          longitude: -122.4194,
          isObaStop: true,
        },
      ],
    };

    mockObaService.getRouteDetails.mockResolvedValue(mockRouteDetails);

    const { result } = renderHook(() => useRouteNavigation());

    await act(async () => {
      await result.current.handleSelectRouteForPath('oba-route-1', {});
    });

    expect(result.current.obaRouteGeometry).toEqual(mockRouteDetails.routeGeometry);
    expect(result.current.currentOBARouteDisplayData).toEqual({
      routeInfo: mockRouteDetails.routeInfo,
      stops: mockRouteDetails.stops,
    });
    expect(mockObaService.getRouteDetails).toHaveBeenCalledWith('oba-route-1');
  });

  it('should handle search result selection', () => {
    const { result } = renderHook(() => useRouteNavigation());

    const searchResult = {
      latitude: 37.7749,
      longitude: -122.4194,
      place_name: 'Test Location',
    };

    act(() => {
      result.current.handleSearchResult(searchResult, 'Test Location');
    });

    expect(result.current.destination).toEqual(searchResult);
  });

  it('should set destination', () => {
    const { result } = renderHook(() => useRouteNavigation());

    const destination = {
      latitude: 37.7749,
      longitude: -122.4194,
    };

    act(() => {
      result.current.handleSetDestination(destination);
    });

    expect(result.current.destination).toEqual(destination);
    expect(result.current.showDirectionsPopup).toBe(false);
  });

  it('should close directions popup', () => {
    const { result } = renderHook(() => useRouteNavigation());

    // First set destination to show popup
    act(() => {
      result.current.handleSetDestination({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    expect(result.current.destination).not.toBeNull();

    // Then close it
    act(() => {
      result.current.handleCloseDirectionsPopup();
    });

    expect(result.current.showDirectionsPopup).toBe(false);
  });

  it('should clear all routes', () => {
    const { result } = renderHook(() => useRouteNavigation());

    // First set some route data
    act(() => {
      result.current.handleSetDestination({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    expect(result.current.destination).not.toBeNull();

    // Then clear everything
    act(() => {
      result.current.clearAllRoutes();
    });

    expect(result.current.route).toBeNull();
    expect(result.current.obaRouteGeometry).toBeNull();
    expect(result.current.currentOBARouteDisplayData).toBeNull();
    expect(result.current.obaVehicleLocations).toEqual([]);
    expect(result.current.destination).toBeNull();
    expect(result.current.routeStartCoords).toBeNull();
    expect(result.current.routeEndCoords).toBeNull();
    expect(result.current.showDirectionsPopup).toBe(false);
  });
}); 