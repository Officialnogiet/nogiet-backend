import { z } from "zod";

export const submitGroundDataSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  measurementDate: z.string().datetime("Invalid date format"),
  methaneReading: z.number().positive("Methane reading must be positive"),
  methodology: z.enum(["OGI Camera", "Sniffer Drone", "Fixed Sensor"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const facilityIdParamSchema = z.object({
  id: z.string().uuid("Invalid facility ID"),
});

export const emissionFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sector: z.string().optional(),
  gasType: z.enum(["CH4", "CO2"]).optional().default("CH4"),
  instrument: z.string().optional(),
  minEmissionRate: z.coerce.number().optional(),
  maxEmissionRate: z.coerce.number().optional(),
  minPlumes: z.coerce.number().int().optional(),
  maxPlumes: z.coerce.number().int().optional(),
  minPersistence: z.coerce.number().optional(),
  maxPersistence: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  bbox: z.string().optional(),
});

export const createFacilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sector: z.string().max(100).optional().default("Oil & Gas"),
  region: z.string().max(100).optional(),
});

export const createAlertSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID").optional(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  emissionRate: z.number().positive().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
});

export type SubmitGroundDataInput = z.infer<typeof submitGroundDataSchema>;
export type EmissionFilterInput = z.infer<typeof emissionFilterSchema>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
