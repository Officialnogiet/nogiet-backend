import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index";
import { hashPassword } from "../utils/hash";

const DATABASE_URL = process.env.DATABASE_URL!;

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // Clean existing data (order matters — child tables first)
  console.log("Clearing existing data...");
  await db.delete(schema.fieldSubmissions).execute();
  await db.delete(schema.groundMeasurements).execute();
  await db.delete(schema.alerts).execute();
  await db.delete(schema.geofences).execute();
  await db.delete(schema.facilities).execute();
  await db.delete(schema.rolePermissions).execute();
  await db.delete(schema.permissions).execute();
  await db.delete(schema.refreshTokens).execute();
  await db.delete(schema.passwordResets).execute();
  await db.delete(schema.users).execute();
  await db.delete(schema.roles).execute();
  console.log("Existing data cleared.");

  // Roles — names must match user_role enum values
  const [superAdminRole] = await db.insert(schema.roles).values([
    { name: "super_admin", description: "Full access — MD, CEO, CDO, CTO" },
    { name: "admin", description: "Management access — Managers, Team Leads" },
    { name: "regulator", description: "Regulator access — NUPRC, NMDPRA officials" },
    { name: "facility_owner", description: "Facility owner — can submit field data and view own facility" },
    { name: "viewer", description: "View-only access — read dashboards, maps, and reports" },
    { name: "member", description: "Standard team member access" },
  ]).returning();

  // Permissions
  const permValues = [
    { name: "live_map", description: "Access live emission map" },
    { name: "data_comparison", description: "Compare ground vs satellite data" },
    { name: "manage_data", description: "Add/edit facilities and ground data" },
    { name: "manage_alerts", description: "Create and manage alerts" },
    { name: "user_management", description: "Manage team members" },
    { name: "role_management", description: "Configure roles and permissions" },
    { name: "settings", description: "Change application settings" },
    { name: "export_data", description: "Export reports and data" },
    { name: "field_data", description: "Submit and view field data collection forms" },
    { name: "geofencing", description: "Create and manage geofences" },
  ];
  const perms = await db.insert(schema.permissions).values(permValues).returning();

  // Super Admin gets all permissions
  if (superAdminRole) {
    await db.insert(schema.rolePermissions).values(
      perms.map((p) => ({ roleId: superAdminRole.id, permissionId: p.id }))
    );
  }

  // Admin user
  const adminHash = await hashPassword("Admin@2026!");
  await db.insert(schema.users).values({
    fullName: "Jerry Okechukwu",
    email: "admin@nogiet.gov.ng",
    phone: "08101790957",
    passwordHash: adminHash,
    role: "super_admin",
  });

  // Facilities — real Nigerian oil & gas infrastructure in the Niger Delta and offshore
  const facilityData = [
    // OML-11 — Rivers State (Shell/NPDC)
    { name: "Bonny Island LNG Terminal", latitude: 4.4183, longitude: 7.1616, sector: "Oil & Gas", region: "South South", state: "Rivers", lga: "Bonny", operator: "NLNG (Shell/NNPC/TotalEnergies/Eni)", facilityType: "LNG Terminal", oilBlock: "OML-11" },
    { name: "Port Harcourt Refinery (Eleme)", latitude: 4.7774, longitude: 7.0085, sector: "Oil & Gas", region: "South South", state: "Rivers", lga: "Eleme", operator: "NNPC", facilityType: "Refinery", oilBlock: "OML-11" },
    { name: "Bomu Flow Station", latitude: 4.6450, longitude: 7.2900, sector: "Oil & Gas", region: "South South", state: "Rivers", lga: "Gokana", operator: "NPDC", facilityType: "Flow Station", oilBlock: "OML-11" },

    // OML-29 — Bayelsa State (Aiteo)
    { name: "Nembe Creek Flow Station", latitude: 4.5200, longitude: 6.4100, sector: "Oil & Gas", region: "South South", state: "Bayelsa", lga: "Nembe", operator: "Aiteo Eastern E&P", facilityType: "Flow Station", oilBlock: "OML-29" },
    { name: "Santa Barbara Platform", latitude: 4.4800, longitude: 6.3600, sector: "Oil & Gas", region: "South South", state: "Bayelsa", lga: "Southern Ijaw", operator: "Aiteo Eastern E&P", facilityType: "Production Platform", oilBlock: "OML-29" },

    // OML-58 — Bayelsa/Rivers (TotalEnergies)
    { name: "Obagi Flow Station", latitude: 5.0200, longitude: 6.7700, sector: "Oil & Gas", region: "South South", state: "Rivers", lga: "Ogba-Egbema-Ndoni", operator: "TotalEnergies", facilityType: "Flow Station", oilBlock: "OML-58" },
    { name: "Gbaran-Ubie Gas Plant", latitude: 4.8800, longitude: 6.3300, sector: "Oil & Gas", region: "South South", state: "Bayelsa", lga: "Yenagoa", operator: "Shell/NNPC", facilityType: "Gas Processing Plant", oilBlock: "OML-58" },

    // OML-42 — Delta State (Shell → NPDC)
    { name: "Forcados Oil Terminal", latitude: 5.3667, longitude: 5.4333, sector: "Oil & Gas", region: "South South", state: "Delta", lga: "Burutu", operator: "Shell/NPDC", facilityType: "Export Terminal", oilBlock: "OML-42" },
    { name: "Jones Creek Flow Station", latitude: 5.4100, longitude: 5.5200, sector: "Oil & Gas", region: "South South", state: "Delta", lga: "Burutu", operator: "Shell/NPDC", facilityType: "Flow Station", oilBlock: "OML-42" },

    // Warri Refinery — Delta State
    { name: "Warri Refinery & Petrochemicals", latitude: 5.5692, longitude: 5.7460, sector: "Oil & Gas", region: "South South", state: "Delta", lga: "Uvwie", operator: "NNPC", facilityType: "Refinery", oilBlock: "OML-30" },

    // Escravos — Delta State (Chevron)
    { name: "Escravos Gas-to-Liquids Plant", latitude: 5.5940, longitude: 5.1580, sector: "Oil & Gas", region: "South South", state: "Delta", lga: "Warri South-West", operator: "Chevron Nigeria", facilityType: "Gas Processing Plant", oilBlock: "OML-49" },
    { name: "Escravos Tank Farm", latitude: 5.5850, longitude: 5.1690, sector: "Oil & Gas", region: "South South", state: "Delta", lga: "Warri South-West", operator: "Chevron Nigeria", facilityType: "Tank Farm", oilBlock: "OML-49" },

    // Offshore — Agbami (Chevron/NNPC)
    { name: "Agbami FPSO (Deepwater)", latitude: 3.4626, longitude: 5.5606, sector: "Oil & Gas", region: "Offshore", state: "Offshore", lga: "Offshore", operator: "Star Deep (Chevron/NNPC)", facilityType: "FPSO", oilBlock: "OML-128" },

    // Akwa Ibom (ExxonMobil)
    { name: "Qua Iboe Terminal", latitude: 4.5400, longitude: 7.9600, sector: "Oil & Gas", region: "South South", state: "Akwa Ibom", lga: "Ibeno", operator: "ExxonMobil", facilityType: "Export Terminal", oilBlock: "OML-13" },
    { name: "Eket Production Hub", latitude: 4.6500, longitude: 7.9200, sector: "Oil & Gas", region: "South South", state: "Akwa Ibom", lga: "Eket", operator: "ExxonMobil", facilityType: "Production Hub", oilBlock: "OML-13" },
  ];

  const insertedFacilities = await db.insert(schema.facilities).values(facilityData).returning();

  // Alerts
  if (insertedFacilities.length > 0) {
    await db.insert(schema.alerts).values([
      {
        facilityId: insertedFacilities[7].id, // Forcados Oil Terminal
        title: "Forcados Terminal - High Methane Output",
        description: "Abnormally high methane output detected at export loading bay",
        emissionRate: 1250,
        severity: "high",
      },
      {
        facilityId: insertedFacilities[10].id, // Escravos GTL
        title: "Escravos GTL - Fugitive Emissions Alert",
        description: "Fugitive methane emissions detected above threshold at processing unit",
        emissionRate: 980,
        severity: "medium",
      },
      {
        facilityId: insertedFacilities[3].id, // Nembe Creek
        title: "Nembe Creek - Pipeline Leak Suspected",
        description: "Elevated methane readings near trunk line pipeline corridor",
        emissionRate: 1580,
        severity: "high",
      },
    ]);
  }

  console.log("Seed completed successfully!");
  await pool.end();
}

seed().catch(console.error);
