// Mock constants and dependencies
jest.mock('@/lib/constants', () => ({
  ONEBUSAWAY_API_KEY: 'test-oba-key',
}));
jest.mock('@/lib/error-utils', () => ({
  handleApiError: jest.fn(() => { throw new Error('API error'); }),
  isValidApiKey: jest.fn(() => true),
}));
jest.mock('@/lib/rate-limiter', () => ({
  rateLimitedRequest: async (fn: Function) => fn(),
  debouncedRateLimitedRequest: async (fn: Function) => fn(),
}));

import { getArrivalsForStop, findNearbyTransit, getRouteDetails, getRoutesForAgency, getScheduleForRoute, getTripDetails, getSituationsForAgency, getStopSchedule } from '../oba';
import { handleApiError, isValidApiKey } from '@/lib/error-utils';

describe('OneBusAway service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getArrivalsForStop', () => {
    it('returns mapped arrivals when response is ok', async () => {
      const mockEntry = { arrivalsAndDepartures: [
        {
          routeId: 'r1', routeShortName: '1', tripId: 't1', tripHeadsign: 'HS',
          stopId: 's1', scheduledArrivalTime: 1000, predictedArrivalTime: 1100,
          status: 'On time', vehicleId: 'v1', distanceFromStop: 50, lastKnownLocationUpdateTime: 900,
        }
      ]};
      const mockJson = { data: { entry: mockEntry } };
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockJson });

      const arrivals = await getArrivalsForStop('stop-1');
      expect(arrivals).toHaveLength(1);
      expect(arrivals[0]).toMatchObject({
        routeId: 'r1', tripHeadsign: 'HS', stopId: 's1', scheduledArrivalTime: 1000,
        predictedArrivalTime: 1100, status: 'On time', vehicleId: 'v1', distanceFromStop: 50,
        lastUpdateTime: 900,
      });
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
      await expect(getArrivalsForStop('stop-2')).rejects.toThrow('API error');
      expect(handleApiError).toHaveBeenCalled();
    });
  });

  describe('findNearbyTransit', () => {
    it('returns mapped stops and routes on success', async () => {
      const coords = { latitude: 10, longitude: 20 };
      const mockResponse = {
        data: {
          list: [ { id: 's1', name: 'Stop1', code: 'C1', direction: 'N', lat:10, lon:20, routeIds: ['r1'], wheelchairBoarding:'1', locationType:0 } ],
          references: { routes: [ { id:'r1', shortName:'1', longName:'Long1', description:'d1', agencyId:'a1', url:'u1', color:'c1', textColor:'tc1', type:3 } ] }
        }
      };
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => mockResponse });

      const result = await findNearbyTransit(coords, 500);
      expect(result.stops).toHaveLength(1);
      expect(result.stops[0]).toMatchObject({ id:'s1', name:'Stop1', code:'C1', latitude:10, longitude:20, routeIds:['r1'], wheelchairBoarding:'1', locationType:0 });
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]).toMatchObject({ id:'r1', shortName:'1', longName:'Long1' });
      expect(result.searchLocation).toMatchObject({ latitude:10, longitude:20, radius:500 });
    });

    it('returns empty arrays on API error', async () => {
      const coords = { latitude: 0, longitude: 0 };
      (global.fetch as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await findNearbyTransit(coords, 100);
      expect(result.stops).toEqual([]);
      expect(result.routes).toEqual([]);
      expect(result.searchLocation).toMatchObject({ latitude:0, longitude:0, radius:100 });
    });
  });

  describe('getRouteDetails', () => {
    it('uses enhanced details and maps stops', async () => {
      const enhanced: any = { id:'r1', shortName:'1', longName:'L1', description:'d1', agencyId:'a1', url:'u1', color:'c1', textColor:'tc1', type:3 };
      // First fetch: getRouteShapes
      const firstResponse = {
        code: 200,
        data: {
          entry: { polylines: [], stopGroupings: [] },
          references: { routes: [enhanced], stops: [], agencies: [] }
        }
      };
      // Second fetch: getRouteDetails stops endpoint
      const secondResponse = {
        data: {
          list: [
            { id:'s1', name:'Stop1', lat:1, lon:2, direction:'N', code:'C1', routeIds:['r1'], wheelchairBoarding:'1', locationType:0 }
          ],
          references: { routes: [], agencies: [] }
        }
      };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => firstResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => secondResponse });

      const result = await getRouteDetails('r1');
      expect(result.routeGeometry).toBeNull();
      expect(result.routeInfo).toEqual(expect.objectContaining({ id:'r1', shortName:'1' }));
      expect(result.stops).toHaveLength(1);
      expect(result.stops[0]).toMatchObject({ id:'s1', name:'Stop1', isObaStop:true });
    });

    it('throws on invalid routeId or missing API key', async () => {
      await expect(getRouteDetails('')).rejects.toThrow();
      (isValidApiKey as jest.Mock).mockReturnValue(false);
      await expect(getRouteDetails('r2')).rejects.toThrow('OneBusAway API Key is missing');
    });
  });
});

// Tests for additional service wrappers

describe('getRoutesForAgency', () => {
  it('returns mapped routes when response is ok', async () => {
    const mockList = [
      { id: 'r1', shortName: '1', longName: 'Line1', description: 'desc', agencyId: 'a1', agency: { name: 'Agency1' }, url: 'u1', color: 'c', textColor: 't', type: 3 }
    ];
    const mockJson = { data: { list: mockList } };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const routes = await getRoutesForAgency('a1');
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ id: 'r1', shortName: '1', longName: 'Line1', agencyId: 'a1' });
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });
    await expect(getRoutesForAgency('a1')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
});

describe('getScheduleForRoute', () => {
  it('returns entry data when response is ok', async () => {
    const entry = { schedule: 'data' };
    const mockJson = { data: { entry } };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getScheduleForRoute('r1');
    expect(result).toEqual(entry);
  });

  it('falls back to data when entry is missing', async () => {
    const data = { foo: 'bar' };
    const mockJson = { data };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getScheduleForRoute('r1');
    expect(result).toEqual(data);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    await expect(getScheduleForRoute('r1')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
});

describe('getTripDetails', () => {
  it('returns entry data when response is ok', async () => {
    const entry = { trip: 'info' };
    const mockJson = { data: { entry } };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getTripDetails('t1');
    expect(result).toEqual(entry);
  });

  it('falls back to data when entry is missing', async () => {
    const data = { foo: 'baz' };
    const mockJson = { data };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getTripDetails('t1');
    expect(result).toEqual(data);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    await expect(getTripDetails('t1')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
});

describe('getSituationsForAgency', () => {
  it('returns list when response is ok', async () => {
    const list = [ { id: 's1' }, { id: 's2' } ];
    const mockJson = { data: { list } };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getSituationsForAgency('a1');
    expect(result).toEqual(list);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    await expect(getSituationsForAgency('a1')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
});

describe('getStopSchedule', () => {
  it('returns entry data when response is ok', async () => {
    const entry = { stoptimes: [] };
    const mockJson = { data: { entry } };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getStopSchedule('stop1');
    expect(result).toEqual(entry);
  });

  it('falls back to data when entry is missing', async () => {
    const data = { foo: 'bar' };
    const mockJson = { data };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockJson });
    const result = await getStopSchedule('stop1');
    expect(result).toEqual(data);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    await expect(getStopSchedule('stop1')).rejects.toThrow('API error');
    expect(handleApiError).toHaveBeenCalled();
  });
}); 