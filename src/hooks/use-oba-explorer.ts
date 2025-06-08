"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useParameterizedFetcher } from '@/hooks/use-data-fetcher';
import {
  getAgenciesWithCoverage,
  getRoutesForAgency,
  getScheduleForRoute,
  getTripDetails,
  findNearbyTransit,
  getArrivalsForStop,
  getVehiclesForRoute,
  getRouteDetails,
  getPopularRoutes,
  getSearchSuggestions,
  getMultipleRouteShapes,
  getSituationsForAgency,
  getStopSchedule
} from '@/services/oba';
import { ONEBUSAWAY_API_KEY } from '@/lib/constants';
import { isValidApiKey, getErrorMessage } from '@/lib/error-utils';
import type {
  ObaAgency,
  ObaRouteSearchResult,
  ObaNearbySearchResult,
  ObaArrivalDeparture,
  ObaVehicleLocation,
  ObaRouteGeometry,
  ObaRoute,
  ObaSearchSuggestion,
  ObaStopSearchResult,
  PointOfInterest
} from '@/types';
import { rateLimitedRequest, obaRateLimiter } from '@/lib/rate-limiter';

export function useObaExplorer() {
  const { toast } = useToast();

  // State for each feature
  const [agencies, setAgencies] = useState<ObaAgency[]>([]);
  const [routes, setRoutes] = useState<ObaRouteSearchResult[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [nearbyResult, setNearbyResult] = useState<ObaNearbySearchResult | null>(null);
  const [arrivals, setArrivals] = useState<ObaArrivalDeparture[]>([]);
  const [vehicles, setVehicles] = useState<ObaVehicleLocation[]>([]);
  const [fullRoute, setFullRoute] = useState<{ routeGeometry: ObaRouteGeometry | null; routeInfo: ObaRoute | null; stops: PointOfInterest[] } | null>(null);
  const [popularRoutes, setPopularRoutes] = useState<ObaRouteSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<ObaSearchSuggestion[]>([]);
  const [comparedRoutes, setComparedRoutes] = useState<Array<{ routeId: string; geometry: ObaRouteGeometry | null; details: ObaRoute | null; stops: ObaStopSearchResult[]; color: string }>>([]);
  const [situations, setSituations] = useState<unknown[]>([]);
  const [stopSchedule, setStopSchedule] = useState<any>(null);

  // Loading states
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingFullRoute, setLoadingFullRoute] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingSituations, setLoadingSituations] = useState(false);
  const [loadingStopSchedule, setLoadingStopSchedule] = useState(false);

  // Fetchers
  const fetchAgencies = useCallback(async () => {
    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
      toast({ title: "API Key Missing", description: "OneBusAway API key is missing.", variant: "destructive" });
      return;
    }
    setLoadingAgencies(true);
    try {
      const data = await getAgenciesWithCoverage();
      setAgencies(data as ObaAgency[]);
    } catch (err) {
      toast({ title: "Error Loading Agencies", description: getErrorMessage(err, "Could not load agencies."), variant: "destructive" });
    } finally {
      setLoadingAgencies(false);
    }
  }, [toast]);

  const fetchRoutes = useParameterizedFetcher<ObaRouteSearchResult[], string>({
    fetcher: async (agencyId) => getRoutesForAgency(agencyId),
    onSuccess: setRoutes,
    onError: (err) => {
      toast({ title: "Error Loading Routes", description: getErrorMessage(err, "Could not load routes."), variant: "destructive" });
      setRoutes([]);
    },
    setLoading: setLoadingRoutes,
  });

  const fetchPopularRoutes = useParameterizedFetcher<ObaRouteSearchResult[], number>({
    fetcher: getPopularRoutes,
    onSuccess: setPopularRoutes,
    onError: (err) => {
      toast({ title: "Error Loading Popular Routes", description: getErrorMessage(err, "Could not load popular routes."), variant: "destructive" });
      setPopularRoutes([]);
    },
    setLoading: setLoadingPopular,
  });

  const fetchSuggestions = useParameterizedFetcher<ObaSearchSuggestion[], string>({
    fetcher: getSearchSuggestions,
    onSuccess: setSuggestions,
    onError: (err) => {
      toast({ title: "Error Loading Suggestions", description: getErrorMessage(err, "Could not load search suggestions."), variant: "destructive" });
      setSuggestions([]);
    },
    setLoading: setLoadingSuggestions,
  });

  const fetchNearby = useParameterizedFetcher<ObaNearbySearchResult, { latitude: number; longitude: number }>(
    {
      fetcher: (coords) => findNearbyTransit(coords, 800),
      onSuccess: setNearbyResult,
      onError: (err) => {
        toast({ title: "Error Loading Nearby Transit", description: getErrorMessage(err, "Could not find nearby transit."), variant: "destructive" });
        setNearbyResult(null);
      },
      setLoading: setLoadingNearby,
    }
  );

  const fetchArrivals = useParameterizedFetcher<ObaArrivalDeparture[], string>({
    fetcher: getArrivalsForStop,
    onSuccess: setArrivals,
    onError: (err) => {
      toast({ title: "Error Loading Arrivals", description: getErrorMessage(err, "Could not load arrivals."), variant: "destructive" });
      setArrivals([]);
    },
    setLoading: setLoadingArrivals,
  });

  const fetchVehicles = useCallback(async (routeId: string) => {
    setLoadingVehicles(true);
    try {
      const data = await rateLimitedRequest(() => getVehiclesForRoute(routeId), 'live vehicle tracking');
      setVehicles(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        const wait = obaRateLimiter.getTimeUntilReset();
        toast({ title: "Rate Limit Exceeded", description: `Please wait ${Math.ceil(wait / 1000)}s before fetching vehicles again.`, variant: "destructive" });
      } else {
        toast({ title: "Error Loading Vehicles", description: getErrorMessage(err, "Could not load vehicle locations."), variant: "destructive" });
      }
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [toast]);

  const fetchFullRoute = useParameterizedFetcher<{ routeGeometry: ObaRouteGeometry | null; routeInfo: ObaRoute | null; stops: PointOfInterest[] }, string>({
    fetcher: getRouteDetails,
    onSuccess: setFullRoute,
    onError: (err) => {
      toast({ title: "Error Loading Route Details", description: getErrorMessage(err, "Could not load route details."), variant: "destructive" });
      setFullRoute(null);
    },
    setLoading: setLoadingFullRoute,
  });

  const fetchCompare = useParameterizedFetcher<{ routes: Array<{ routeId: string; geometry: ObaRouteGeometry | null; details: ObaRoute | null; stops: ObaStopSearchResult[]; color: string }> }, string[]>({
    fetcher: getMultipleRouteShapes,
    onSuccess: (data) => setComparedRoutes(data.routes),
    onError: (err) => {
      toast({ title: "Error Comparing Routes", description: getErrorMessage(err, "Could not compare routes."), variant: "destructive" });
      setComparedRoutes([]);
    },
    setLoading: setLoadingCompare,
  });

  const fetchSituations = useParameterizedFetcher<unknown[], string>({
    fetcher: getSituationsForAgency,
    onSuccess: setSituations,
    onError: (err) => {
      toast({ title: "Error Loading Situations", description: getErrorMessage(err, "Could not load situations."), variant: "destructive" });
      setSituations([]);
    },
    setLoading: setLoadingSituations,
  });

  const fetchStopSchedule = useParameterizedFetcher<any, string>({
    fetcher: getStopSchedule,
    onSuccess: setStopSchedule,
    onError: (err) => {
      toast({ title: "Error Loading Stop Schedule", description: getErrorMessage(err, "Could not load stop schedule."), variant: "destructive" });
      setStopSchedule(null);
    },
    setLoading: setLoadingStopSchedule,
  });

  // Fetch schedule for a route
  const fetchSchedule = useParameterizedFetcher<any, string>({
    fetcher: getScheduleForRoute,
    onSuccess: setSchedule,
    onError: (err) => {
      toast({ title: "Error Loading Schedule", description: getErrorMessage(err, "Could not load schedule."), variant: "destructive" });
      setSchedule(null);
    },
    setLoading: setLoadingSchedule,
  });

  // Fetch trip details for a scheduled trip
  const fetchTripDetails = useParameterizedFetcher<any, string>({
    fetcher: getTripDetails,
    onSuccess: setTripDetails,
    onError: (err) => {
      toast({ title: "Error Loading Trip Details", description: getErrorMessage(err, "Could not load trip details."), variant: "destructive" });
      setTripDetails(null);
    },
    setLoading: setLoadingTrip,
  });

  // Initial fetches
  useEffect(() => {
    fetchAgencies();
    fetchPopularRoutes(20);
  }, [fetchAgencies, fetchPopularRoutes]);

  return {
    // Data
    agencies,
    routes,
    schedule,
    tripDetails,
    nearbyResult,
    arrivals,
    vehicles,
    fullRoute,
    popularRoutes,
    suggestions,
    comparedRoutes,
    situations,
    stopSchedule,
    // Fetchers
    fetchRoutes,
    fetchSchedule,
    fetchTripDetails,
    fetchNearby,
    fetchArrivals,
    fetchVehicles,
    fetchFullRoute,
    fetchPopularRoutes,
    fetchSuggestions,
    fetchCompare,
    fetchSituations,
    fetchStopSchedule,
    // Loading flags
    loadingAgencies,
    loadingRoutes,
    loadingSchedule,
    loadingTrip,
    loadingNearby,
    loadingArrivals,
    loadingVehicles,
    loadingFullRoute,
    loadingPopular,
    loadingSuggestions,
    loadingCompare,
    loadingSituations,
    loadingStopSchedule,
  };
} 