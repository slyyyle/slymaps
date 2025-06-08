import { renderHook, act } from '@testing-library/react';
import { useMapState } from '../use-map-state';

// Mock the constants and utils
jest.mock('@/lib/constants', () => ({
  INITIAL_VIEW_STATE: {
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12,
  },
  MAP_STYLES: [
    { id: 'standard', name: 'Standard', url: 'mapbox://styles/mapbox/standard' }
  ],
}));

jest.mock('@/lib/time-utils', () => ({
  getTimeBasedLightingPreset: jest.fn(() => 'day'),
}));

jest.mock('@/lib/logging', () => ({
  log: {
    ui: jest.fn(),
    time: jest.fn(),
    lighting3d: jest.fn(),
    warning: jest.fn(),
    control: jest.fn(),
  },
}));

describe('useMapState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getCurrentPosition to avoid real geolocation calls
    (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success) => {
        success({
          coords: {
            latitude: 47.6062,
            longitude: -122.3321,
          },
        });
      }
    );
  });

  it('should initialize with default values', () => {
    // Mock geolocation to return error initially
    (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success, error) => {
        error(new Error('Geolocation not available'));
      }
    );

    const { result } = renderHook(() => useMapState());

    expect(result.current.viewState).toEqual({
      longitude: -122.4194,
      latitude: 37.7749,
      zoom: 12,
    });
    expect(result.current.currentMapStyle).toEqual({
      id: 'standard',
      name: 'Standard',
      url: 'mapbox://styles/mapbox/standard'
    });
    expect(result.current.currentLightPreset).toBe('day');
    expect(result.current.isAutoLighting).toBe(true);
    expect(result.current.currentLocation).toBeNull();
  });

  it('should update current location from geolocation', async () => {
    const { result } = renderHook(() => useMapState());

    // Wait for the geolocation effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.currentLocation).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
    });
  });

  it('should handle geolocation error gracefully', async () => {
    // Mock geolocation error
    (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (success, error) => {
        error(new Error('Geolocation denied'));
      }
    );

    const { result } = renderHook(() => useMapState());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.currentLocation).toBeNull();
  });

  it('should update view state when handleFlyTo is called', () => {
    const { result } = renderHook(() => useMapState());

    act(() => {
      result.current.handleFlyTo({ latitude: 40.7128, longitude: -74.0060 }, 15);
    });

    expect(result.current.viewState).toEqual(expect.objectContaining({
      longitude: -74.0060,
      latitude: 40.7128,
      zoom: 15,
      transitionDuration: 1500,
    }));
  });

  it('should use default zoom when handleFlyTo is called without zoom', () => {
    const { result } = renderHook(() => useMapState());

    act(() => {
      result.current.handleFlyTo({ latitude: 40.7128, longitude: -74.0060 });
    });

    expect(result.current.viewState.zoom).toBe(15); // default zoom
  });

  it('should update lighting preset when handleChangeLightPreset is called', () => {
    const { result } = renderHook(() => useMapState());

    // Mock mapRef
    const mockMap = {
      setConfigProperty: jest.fn(),
    };
    result.current.mapRef.current = {
      getMap: () => mockMap,
    } as any;

    act(() => {
      result.current.handleChangeLightPreset('night');
    });

    expect(result.current.currentLightPreset).toBe('night');
    expect(mockMap.setConfigProperty).toHaveBeenCalledWith('basemap', 'lightPreset', 'night');
  });

  it('should not change lighting if mapRef is not available', () => {
    const { result } = renderHook(() => useMapState());

    // mapRef is null by default
    act(() => {
      result.current.handleChangeLightPreset('night');
    });

    // Should still be the initial value
    expect(result.current.currentLightPreset).toBe('day');
  });

  it('should handle map style changes', () => {
    const { result } = renderHook(() => useMapState());

    const newStyle = { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' };

    act(() => {
      result.current.setCurrentMapStyle(newStyle);
    });

    expect(result.current.currentMapStyle).toEqual(newStyle);
  });

  it('should toggle auto lighting correctly', () => {
    const { result } = renderHook(() => useMapState());

    // Mock mapRef
    const mockMap = {
      setConfigProperty: jest.fn(),
    };
    result.current.mapRef.current = {
      getMap: () => mockMap,
    } as any;

    act(() => {
      result.current.handleToggleAutoLighting(false);
    });

    expect(result.current.isAutoLighting).toBe(false);

    act(() => {
      result.current.handleToggleAutoLighting(true);
    });

    expect(result.current.isAutoLighting).toBe(true);
    expect(mockMap.setConfigProperty).toHaveBeenCalled();
  });

  it('should set time-based lighting when auto lighting is enabled', () => {
    const mockGetTimeBasedLightingPreset = require('@/lib/time-utils').getTimeBasedLightingPreset;
    mockGetTimeBasedLightingPreset.mockReturnValue('dusk');

    // Create hook with auto lighting initially disabled
    const { result } = renderHook(() => useMapState());

    act(() => {
      result.current.handleToggleAutoLighting(false);
    });

    expect(result.current.isAutoLighting).toBe(false);

    // Mock mapRef for when auto lighting is re-enabled
    const mockMap = {
      setConfigProperty: jest.fn(),
    };
    result.current.mapRef.current = {
      getMap: () => mockMap,
    } as any;

    act(() => {
      result.current.handleToggleAutoLighting(true);
    });

    expect(result.current.isAutoLighting).toBe(true);
    expect(mockGetTimeBasedLightingPreset).toHaveBeenCalled();
  });
}); 