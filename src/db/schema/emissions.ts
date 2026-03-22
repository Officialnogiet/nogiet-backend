import { pgTable, uuid, varchar, text, timestamp, real, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const facilities = pgTable("facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  sector: varchar("sector", { length: 100 }).default("Oil & Gas"),
  region: varchar("region", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groundMeasurements = pgTable("ground_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" })
    .notNull(),
  submittedBy: uuid("submitted_by")
    .references(() => users.id)
    .notNull(),
  measurementDate: timestamp("measurement_date", { withTimezone: true }).notNull(),
  methaneReading: real("methane_reading").notNull(),
  methodology: varchar("methodology", { length: 100 }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .references(() => facilities.id, { onDelete: "cascade" }),
  sourceName: varchar("source_name", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  emissionRate: real("emission_rate"),
  severity: varchar("severity", { length: 20 }).default("medium"),
  isRead: integer("is_read").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
