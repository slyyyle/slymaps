import { z } from 'zod';

export const OBAStopSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().optional(),
  code: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  routeIds: z.array(z.string()).optional(),
  direction: z.string().optional(),
  wheelchairBoarding: z.boolean().optional(),
});

export const OneBusAwayResponseSchema = z.object({
  data: z.object({
    list: z.array(OBAStopSchema).optional(),
  }),
});

export type OBAStop = z.infer<typeof OBAStopSchema>; 