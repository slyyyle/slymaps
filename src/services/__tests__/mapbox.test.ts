// Mock the Mapbox token before importing the service
const TEST_TOKEN = 'test-token';
jest.mock('@/lib/constants', () => ({
  MAPBOX_ACCESS_TOKEN: TEST_TOKEN,
}));

import { getDirections } from '../mapbox';
import { handleApiError } from '@/lib/error-utils';

describe('getDirections (Mapbox service)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(require('@/lib/error-utils'), 'handleApiError').mockImplementation(() => { throw new Error('API error'); });
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('maps transit mode to driving-traffic and walking/cycling correctly', async () => {
    const mockRoute = { geometry: { type: 'LineString', coordinates: [] }, legs: [], distance: 123, duration: 456 };
    const mockJson = { routes: [mockRoute] };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockJson });

    // Walking
    let route = await getDirections({ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }, 'walking');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/walking/2,1;4,3?');
    expect(route).toMatchObject({ distance: 123, duration: 456 });

    // Cycling
    route = await getDirections({ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }, 'cycling');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('/cycling/2,1;4,3?');

    // Transit (mapped to driving-traffic)
    route = await getDirections({ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }, 'transit');
    expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain('/driving-traffic/2,1;4,3?');

    // Driving-traffic default
    route = await getDirections({ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 });
    expect((global.fetch as jest.Mock).mock.calls[3][0]).toContain('/driving-traffic/2,1;4,3?');
  });

  it('returns null when no routes are found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) });
    const route = await getDirections({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }, 'driving-traffic');
    expect(route).toBeNull();
  });

  it('throws when fetch response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(getDirections({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }, 'driving-traffic')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
}); 