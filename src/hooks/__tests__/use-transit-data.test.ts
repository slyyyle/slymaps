import { renderHook, act } from '@testing-library/react';
import { useTransitData } from '../use-transit-data';
import type { PointOfInterest, ObaArrivalDeparture, ObaRoute, ObaStopSearchResult } from '@/types';
import * as mockObaService from '@/services/oba';

// Mock the services
jest.mock('@/lib/logging', () => ({
  log: {
    oba: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-data-fetcher', () => ({
  useParameterizedFetcher: jest.fn(({ fetcher, onSuccess, onError, setLoading }: any) => {
    return jest.fn(async (param: any) => {
      setLoading(true);
      try {
        const result = await fetcher(param);
        onSuccess(result);
        return result;
      } catch (error) {
        onError(error);
        return [];
      } finally {
        setLoading(false);
      }
    });
  }),
}));

describe('useTransitData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTransitData());

    expect(result.current.obaStopsData).toEqual([]);
    expect(result.current.selectedPoi).toBeNull();
    expect(result.current.obaStopArrivals).toEqual([]);
    expect(result.current.isLoadingArrivals).toBe(false);
    expect(result.current.obaReferencedRoutes).toEqual({});
  });

  it('should handle poi selection', () => {
    const { result } = renderHook(() => useTransitData());

    const testPoi: PointOfInterest = {
      id: 'test-poi-1',
      name: 'Test POI',
      type: 'Restaurant',
      latitude: 47.6062,
      longitude: -122.3321,
      isObaStop: false,
    };

    act(() => {
      result.current.handleSelectPoi(testPoi);
    });

    expect(result.current.selectedPoi).toEqual(testPoi);
  });

  it('should handle stop selection and fetch arrivals', async () => {
    const mockArrivals: ObaArrivalDeparture[] = [
      {
        routeId: 'route-1',
        routeShortName: '1',
        tripId: 'trip-1',
        tripHeadsign: 'Downtown',
        stopId: 'stop-1',
        scheduledArrivalTime: Date.now() + 300000, // 5 minutes from now
        predictedArrivalTime: Date.now() + 360000, // 6 minutes from now
      }
    ];

    // @ts-ignore: Jest mocking
    (mockObaService.getArrivalsForStop as jest.Mock).mockResolvedValue(mockArrivals);

    const { result } = renderHook(() => useTransitData());

    const testStop: ObaStopSearchResult = {
      id: 'stop-1',
      name: 'Test Transit Stop',
      code: '123',
      latitude: 47.6062,
      longitude: -122.3321,
      routeIds: ['route-1'],
    };

    await act(async () => {
      result.current.handleStopSelect(testStop);
    });

    expect(result.current.selectedPoi).toEqual(expect.objectContaining({
      id: 'stop-1',
      name: 'Test Transit Stop',
      type: 'Bus Stop',
      latitude: 47.6062,
      longitude: -122.3321,
      isObaStop: true,
      code: '123',
    }));
    expect(result.current.obaStopArrivals).toEqual(mockArrivals);
    expect(mockObaService.getArrivalsForStop).toHaveBeenCalledWith('stop-1');
  });

  it('should handle stop selection error gracefully', async () => {
    // @ts-ignore: Jest mocking
    (mockObaService.getArrivalsForStop as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTransitData());

    const testStop: ObaStopSearchResult = {
      id: 'stop-1',
      name: 'Test Transit Stop',
      code: '123',
      latitude: 47.6062,
      longitude: -122.3321,
      routeIds: ['route-1'],
    };

    await act(async () => {
      result.current.handleStopSelect(testStop);
    });

    expect(result.current.selectedPoi).toEqual(expect.objectContaining({
      id: 'stop-1',
      name: 'Test Transit Stop',
      type: 'Bus Stop',
      latitude: 47.6062,
      longitude: -122.3321,
      isObaStop: true,
      code: '123',
    }));
    expect(result.current.obaStopArrivals).toEqual([]);
  });

  it('should handle nearby transit search', async () => {
    const mockNearbyData = {
      stops: [
        {
          id: 'nearby-stop-1',
          name: 'Nearby Stop 1',
          code: '123',
          latitude: 47.6062,
          longitude: -122.3321,
          routeIds: ['route-1'],
        }
      ],
      routes: [
        {
          id: 'route-1',
          shortName: '1',
          longName: 'Metro Route 1',
          agencyId: 'agency-1',
        }
      ],
      searchLocation: {
        latitude: 47.6062,
        longitude: -122.3321,
        radius: 400,
      }
    };

    // @ts-ignore: Jest mocking
    (mockObaService.findNearbyTransit as jest.Mock).mockResolvedValue(mockNearbyData);

    const { result } = renderHook(() => useTransitData());

    await act(async () => {
      await result.current.handleTransitNearby({ latitude: 47.6062, longitude: -122.3321 });
    });

    expect(result.current.obaStopsData).toHaveLength(1);
    expect(result.current.obaStopsData[0]).toEqual(expect.objectContaining({
      id: 'nearby-stop-1',
      name: 'Nearby Stop 1',
      type: 'Bus Stop',
      latitude: 47.6062,
      longitude: -122.3321,
      isObaStop: true,
    }));
    
    expect(mockObaService.findNearbyTransit).toHaveBeenCalledWith({ latitude: 47.6062, longitude: -122.3321 }, 800);
  });

  it('should handle nearby search error gracefully', async () => {
    // @ts-ignore: Jest mocking
    (mockObaService.findNearbyTransit as jest.Mock).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useTransitData());

    await act(async () => {
      await result.current.handleTransitNearby({ latitude: 47.6062, longitude: -122.3321 });
    });

    expect(result.current.obaStopsData).toEqual([]);
  });

  it('should clear transit data', () => {
    const { result } = renderHook(() => useTransitData());

    // First, set some data
    const testPoi: PointOfInterest = {
      id: 'test-poi-1',
      name: 'Test POI',
      type: 'Restaurant',
      latitude: 47.6062,
      longitude: -122.3321,
      isObaStop: false,
    };

    act(() => {
      result.current.handleSelectPoi(testPoi);
    });

    expect(result.current.selectedPoi).toEqual(testPoi);

    // Now clear it
    act(() => {
      result.current.clearTransitData();
    });

    expect(result.current.obaStopsData).toEqual([]);
    expect(result.current.selectedPoi).toBeNull();
    expect(result.current.obaStopArrivals).toEqual([]);
    expect(result.current.obaReferencedRoutes).toEqual({});
  });
}); 