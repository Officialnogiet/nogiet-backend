import { FastifyInstance } from "fastify";
import { EmissionController } from "../controllers/emission.controller";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {
  submitGroundDataSchema,
  facilityIdParamSchema,
  emissionFilterSchema,
  createFacilitySchema,
  createAlertSchema,
} from "../validations/emission.validation";

export function emissionRoutes(fastify: FastifyInstance, controller: EmissionController) {
  fastify.get("/facilities", {
    preHandler: [authenticate],
    handler: controller.getFacilities,
  });

  fastify.get("/facilities/:id", {
    preHandler: [authenticate, validate(facilityIdParamSchema, "params")],
    handler: controller.getFacilityById,
  });

  fastify.post("/facilities", {
    preHandler: [authenticate, validate(createFacilitySchema)],
    handler: controller.createFacility,
  });

  fastify.delete("/facilities/:id", {
    preHandler: [authenticate, validate(facilityIdParamSchema, "params")],
    handler: controller.deleteFacility,
  });

  fastify.post("/alerts", {
    preHandler: [authenticate, validate(createAlertSchema)],
    handler: controller.createAlert,
  });

  fastify.post("/ground-data", {
    preHandler: [authenticate, validate(submitGroundDataSchema)],
    handler: controller.submitGroundData,
  });

  fastify.get("/ground-data/:id", {
    preHandler: [authenticate, validate(facilityIdParamSchema, "params")],
    handler: controller.getGroundData,
  });

  fastify.get("/alerts", {
    preHandler: [authenticate],
    handler: controller.getAlerts,
  });

  fastify.post("/alerts/mark-read", {
    preHandler: [authenticate],
    handler: controller.markAllAlertsRead,
  });

  fastify.get("/alerts/unread-count", {
    preHandler: [authenticate],
    handler: controller.getUnreadAlertCount,
  });

  fastify.get("/stats", {
    preHandler: [authenticate],
    handler: controller.getStats,
  });

  fastify.post("/settings/alert-threshold", {
    preHandler: [authenticate],
    handler: controller.setAlertThreshold,
  });

  fastify.post("/settings/email-alerts", {
    preHandler: [authenticate],
    handler: controller.setEmailAlerts,
  });

  fastify.get("/satellite/sources", {
    preHandler: [authenticate, validate(emissionFilterSchema, "querystring")],
    handler: controller.getSatelliteSources,
  });

  fastify.get("/satellite/refresh", {
    preHandler: [authenticate, validate(emissionFilterSchema, "querystring")],
    handler: controller.refreshSatelliteRegion,
  });

  fastify.get("/satellite/plumes/:sourceId", {
    preHandler: [authenticate],
    handler: controller.getSatellitePlumes,
  });

  fastify.get("/comparison/:id", {
    preHandler: [authenticate, validate(facilityIdParamSchema, "params")],
    handler: controller.getComparisonData,
  });
}
