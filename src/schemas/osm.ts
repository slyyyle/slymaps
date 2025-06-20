import { z } from 'zod';

// Schema for coordinates
export const CoordinatesSchema = z.object({ lat: z.number(), lon: z.number() });

// Schema for the OSM POI data returned by Overpass
export const OSMPoiDataSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  subclass: z.string().optional(),
  opening_hours: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  operator: z.string().optional(),
  brand: z.string().optional(),
  address: z.any().optional(),  // AddressInput can vary
  cuisine: z.string().optional(),
  amenity: z.string().optional(),
  shop: z.string().optional(),
  tourism: z.string().optional(),
  coordinates: CoordinatesSchema,
});

export type OSMPoiData = z.infer<typeof OSMPoiDataSchema>; 