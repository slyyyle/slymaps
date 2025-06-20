import { z } from 'zod';

// Raw Overpass element as returned by the Overpass API
export const RawOverpassElementSchema = z.object({
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
  id: z.union([z.number(), z.string()]),
  type: z.string(),
});

// Full Overpass API response JSON
export const RawOverpassResponseSchema = z.object({
  elements: z.array(RawOverpassElementSchema).optional(),
});

export type RawOverpassResponse = z.infer<typeof RawOverpassResponseSchema>; 