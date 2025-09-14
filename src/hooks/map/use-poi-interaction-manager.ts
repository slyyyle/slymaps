import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Place, Coordinates } from '@/types/core';

/**
 * Centralized POI Interaction Manager
 * 
 * Segregates different types of POI interactions to prevent lifecycle conflicts:
 * 1. Native Mapbox POIs (ephemeral) - handled via addInteraction API
 * 2. Stored POIs (persistent) - handled via React markers  
 * 3. Search Results (temporary) - handled via React markers
 * 4. User-created POIs (persistent) - handled via React markers
 */

export type PlaceInteractionType = 'native' | 'stored' | 'search' | 'created';

export interface POIInteractionEvent {
	type: PlaceInteractionType;
	poi: Place;
	coordinates: Coordinates;
	source: 'click' | 'hover' | 'context';
}

interface POIInteractionManagerProps {
	map: MapRef | null;
	onPOIInteraction: (event: POIInteractionEvent) => void;
	enabledTypes?: PlaceInteractionType[];
}

export function usePOIInteractionManager({
	map,
	onPOIInteraction,
	enabledTypes = ['native', 'stored', 'search', 'created']
}: POIInteractionManagerProps) {
	// 🔧 CORE FIX: Use refs for stable references
	const onPOIInteractionRef = useRef(onPOIInteraction);
	const enabledTypesRef = useRef(enabledTypes);
	const interactionSetupRef = useRef(false);
	const mapRef = useRef<MapRef | null>(null);

	// Keep refs current without causing re-renders
	useEffect(() => {
		onPOIInteractionRef.current = onPOIInteraction;
	});

	useEffect(() => {
		enabledTypesRef.current = enabledTypes;
	});

	// 🔧 CORE FIX: Setup native interactions once, not on every render
	const setupNativeInteractions = useCallback(() => {
		if (!mapRef.current || interactionSetupRef.current) return;
		
		const mapInstance = mapRef.current.getMap();
		if (!mapInstance || !mapInstance.isStyleLoaded()) return;

		// Remove existing interaction if it exists
		try { mapInstance.removeInteraction('poi-interaction-native'); } catch {}

		const handler = (evt: any) => {
			const f = evt?.feature as { id?: string; properties?: Record<string, unknown>; geometry?: { coordinates?: [number, number] } } | undefined;
			if (!f || !f.id || !f.properties || !f.geometry || !Array.isArray(f.geometry.coordinates)) return;
			const [lon, lat] = f.geometry.coordinates as [number, number];
			const ephemeralPoi: Place = {
				id: `native-ephemeral-${f.id}-${Date.now()}`,
				name: (f.properties.name as string) || 'Native POI',
				type: mapNativeFeatureType(f.properties),
				latitude: lat,
				longitude: lon,
				description: '',
				isNativePoi: true,
				properties: f.properties
			};

			const event: POIInteractionEvent = {
				type: 'native',
				poi: ephemeralPoi,
				coordinates: { latitude: lat, longitude: lon },
				source: 'click'
			};

			onPOIInteractionRef.current(event);
		};

		// Primary POI featureset (Standard v3)
		try { mapInstance.addInteraction('poi-interaction-native', {
			type: 'click',
			target: { featuresetId: 'poi', importId: 'basemap' },
			handler
		}); } catch {}

		interactionSetupRef.current = true;
	}, []);

	// 🔧 CORE FIX: Stable handlers that don't recreate
	const handleStoredPlaceClick = useCallback((poi: Place) => {
		const event: POIInteractionEvent = {
			type: 'stored',
			poi,
			coordinates: { latitude: poi.latitude, longitude: poi.longitude },
			source: 'click'
		};
		onPOIInteractionRef.current(event);
	}, []); // No dependencies = stable forever

	const handleSearchResultClick = useCallback((poi: Place) => {
		const event: POIInteractionEvent = {
			type: 'search',
			poi,
			coordinates: { latitude: poi.latitude, longitude: poi.longitude },
			source: 'click'
		};
		onPOIInteractionRef.current(event);
	}, []);

	const handleCreatedPlaceClick = useCallback((poi: Place) => {
		const event: POIInteractionEvent = {
			type: 'created',
			poi,
			coordinates: { latitude: poi.latitude, longitude: poi.longitude },
			source: 'click'
		};
		onPOIInteractionRef.current(event);
	}, []);

	// Setup interactions when map is ready
	useEffect(() => {
		mapRef.current = map;
		
		if (!map) {
			// Clean up previous interactions when map is removed
			const prevMap = mapRef.current;
			if (prevMap) {
				const prevMapInstance = prevMap.getMap();
				if (prevMapInstance) {
					try { prevMapInstance.removeInteraction('poi-interaction-native'); } catch {}
				}
			}
			interactionSetupRef.current = false;
			return;
		}

		const mapInstance = map.getMap();
		if (!mapInstance) return;

		const handleStyleLoad = () => {
			setupNativeInteractions();
		};

		if (mapInstance.isStyleLoaded()) {
			handleStyleLoad();
		} else {
			mapInstance.once('style.load', handleStyleLoad);
		}

		// Cleanup function for when map ref changes
		return () => {
			if (mapInstance) {
				try { mapInstance.removeInteraction('poi-interaction-native'); } catch {}
			}
			interactionSetupRef.current = false;
		};
	}, [map, setupNativeInteractions]); // 🔧 CORE FIX: Only depends on map reference

	return {
		handleStoredPlaceClick,
		handleSearchResultClick,
		handleCreatedPlaceClick,
		isNativeInteractionActive: interactionSetupRef.current
	};
}

// Helper function to map native feature properties to POI type
function mapNativeFeatureType(props: Record<string, unknown>): string {
	if ((props as any).group === 'transit') {
		if ((props as any).transit_mode === 'tram') return 'Tram Station';
		if ((props as any).transit_mode === 'bus') return 'Bus Stop';
		if ((props as any).transit_mode === 'rail') return 'Rail Station';
		return 'Transit Stop';
	}
	
	if ((props as any).class && typeof (props as any).class === 'string') {
		return ((props as any).class as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
	}
	
	return 'Place';
} 