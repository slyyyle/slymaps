"use client";

import React, { useState } from 'react';
import { useObaExplorer } from '@/hooks/use-oba-explorer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export function AgencyBrowser() {
  const {
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
  } = useObaExplorer();

  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [agencyIdInput, setAgencyIdInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compareIds, setCompareIds] = useState('');
  const [coordsInput, setCoordsInput] = useState({ latitude: '', longitude: '' });
  const [stopIdInput, setStopIdInput] = useState('');
  const [routeIdInput, setRouteIdInput] = useState('');
  const [agencyForSituations, setAgencyForSituations] = useState('');

  return (
    <Accordion type="multiple" className="space-y-4 p-2">
      {/* Agencies */}
      <AccordionItem value="agencies">
        <AccordionTrigger>Agencies</AccordionTrigger>
        <AccordionContent>
          {loadingAgencies ? (
            <div>Loading agencies...</div>
          ) : (
            <ScrollArea className="max-h-32 border rounded">
              <ul className="space-y-1 p-2">
                {agencies.map(a => (
                  <li key={a.id}>
                    <Button
                      variant={a.id === selectedAgency ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedAgency(a.id);
                        setSelectedRoute(null);
                        fetchRoutes(a.id);
                      }}
                      className="w-full text-left"
                    >
                      {a.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Popular Routes */}
      <AccordionItem value="popular">
        <AccordionTrigger>Popular Routes</AccordionTrigger>
        <AccordionContent>
          {loadingPopular ? (
            <div>Loading popular routes...</div>
          ) : (
            <ScrollArea className="max-h-32 border rounded">
              <ul className="space-y-1 p-2">
                {popularRoutes.map(r => (
                  <li key={r.id}>
                    <div className="text-sm">{r.shortName} {r.longName}</div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Search Suggestions */}
      <AccordionItem value="suggestions">
        <AccordionTrigger>Search Suggestions</AccordionTrigger>
        <AccordionContent>
          <Input
            placeholder="Enter search term"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); fetchSuggestions(e.target.value); }}
            className="mb-2"
          />
          {loadingSuggestions ? <div>Loading suggestions...</div> : (
            <ul className="space-y-1">
              {suggestions.map(s => (
                <li key={s.id} className="text-sm">
                  {s.title}
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Full Route Details */}
      <AccordionItem value="full-route">
        <AccordionTrigger>Route Details & Geometry</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Route ID" value={routeIdInput} onChange={e => setRouteIdInput(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchFullRoute(routeIdInput)} className="mb-2">Fetch Details</Button>
          {loadingFullRoute ? <div>Loading route...</div> : fullRoute ? (
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(fullRoute, null, 2)}</pre>
          ) : <div>No route data.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Route Schedule & Trips */}
      <AccordionItem value="schedule">
        <AccordionTrigger>Route Schedule & Trips</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Route ID" value={routeIdInput} onChange={e => setRouteIdInput(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchSchedule(routeIdInput)} className="mb-2">Fetch Schedule</Button>
          {loadingSchedule ? <div>Loading schedule...</div> : schedule ? (
            <div>
              <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(schedule, null, 2)}</pre>
              <div className="mt-2 text-sm font-medium">Trips:</div>
              <ul className="space-y-1">
                {Array.isArray(schedule.stopTimes) ? schedule.stopTimes.map((st: any) => (
                  <li key={st.tripId}>
                    <Button size="sm" variant="outline" onClick={() => fetchTripDetails(st.tripId)}>{st.tripId}</Button>
                  </li>
                )) : <li>No trips.</li>}
              </ul>
            </div>
          ) : <div>No schedule loaded.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Live Vehicle Tracking */}
      <AccordionItem value="vehicles">
        <AccordionTrigger>Live Vehicle Tracking</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Route ID" value={routeIdInput} onChange={e => setRouteIdInput(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchVehicles(routeIdInput)} className="mb-2">Fetch Vehicles</Button>
          {loadingVehicles ? <div>Loading vehicles...</div> : vehicles.length ? (
            <ul className="space-y-1 text-sm">
              {vehicles.map(v => <li key={v.id}>{v.tripHeadsign || v.id}: ({v.latitude.toFixed(5)}, {v.longitude.toFixed(5)})</li>)}
            </ul>
          ) : <div>No vehicles.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Nearby Transit */}
      <AccordionItem value="nearby">
        <AccordionTrigger>Nearby Transit</AccordionTrigger>
        <AccordionContent>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Latitude" value={coordsInput.latitude} onChange={e => setCoordsInput({ ...coordsInput, latitude: e.target.value })} />
            <Input placeholder="Longitude" value={coordsInput.longitude} onChange={e => setCoordsInput({ ...coordsInput, longitude: e.target.value })} />
            <Button size="sm" onClick={() => fetchNearby({ latitude: parseFloat(coordsInput.latitude), longitude: parseFloat(coordsInput.longitude) })}>Search</Button>
          </div>
          {loadingNearby ? <div>Loading nearby...</div> : nearbyResult ? (
            <div>
              <div className="font-medium">Stops:</div>
              <ul className="text-sm space-y-1 mb-2">{nearbyResult.stops.map(s => <li key={s.id}>{s.name}</li>)}</ul>
              <div className="font-medium">Routes:</div>
              <ul className="text-sm space-y-1">{nearbyResult.routes.map(r => <li key={r.id}>{r.shortName}</li>)}</ul>
            </div>
          ) : <div>No data.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Arrivals & Departures */}
      <AccordionItem value="arrivals">
        <AccordionTrigger>Arrivals & Departures</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Stop ID" value={stopIdInput} onChange={e => setStopIdInput(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchArrivals(stopIdInput)} className="mb-2">Fetch Arrivals</Button>
          {loadingArrivals ? <div>Loading arrivals...</div> : arrivals.length ? (
            <ul className="text-sm space-y-1">{arrivals.map(a => <li key={a.tripId}>{a.routeShortName} @ {new Date(a.scheduledArrivalTime).toLocaleTimeString()}</li>)}</ul>
          ) : <div>No arrivals.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Stop Schedule */}
      <AccordionItem value="stop-schedule">
        <AccordionTrigger>Stop Schedule</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Stop ID" value={stopIdInput} onChange={e => setStopIdInput(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchStopSchedule(stopIdInput)} className="mb-2">Fetch Stop Schedule</Button>
          {loadingStopSchedule ? <div>Loading stop schedule...</div> : stopSchedule ? (
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(stopSchedule, null, 2)}</pre>
          ) : <div>No schedule.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Search Suggestions Comparison */}
      <AccordionItem value="compare">
        <AccordionTrigger>Compare Routes</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Route IDs (comma-separated)" value={compareIds} onChange={e => setCompareIds(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchCompare(compareIds.split(',').map(id => id.trim()))} className="mb-2">Compare</Button>
          {loadingCompare ? <div>Comparing routes...</div> : comparedRoutes.length ? (
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(comparedRoutes, null, 2)}</pre>
          ) : <div>No comparison data.</div>}
        </AccordionContent>
      </AccordionItem>

      {/* Situations & Alerts */}
      <AccordionItem value="situations">
        <AccordionTrigger>Situations & Alerts</AccordionTrigger>
        <AccordionContent>
          <Input placeholder="Agency ID" value={agencyForSituations} onChange={e => setAgencyForSituations(e.target.value)} className="mb-2" />
          <Button size="sm" onClick={() => fetchSituations(agencyForSituations)} className="mb-2">Fetch Situations</Button>
          {loadingSituations ? <div>Loading situations...</div> : situations.length ? (
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(situations, null, 2)}</pre>
          ) : <div>No situations.</div>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
} 