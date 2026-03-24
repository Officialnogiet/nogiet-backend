import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";
import { hashPassword } from "../utils/hash";

const DATABASE_URL = process.env.DATABASE_URL!;

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // Roles — names must match user_role enum values
  const [superAdminRole] = await db.insert(schema.roles).values([
    { name: "super_admin", description: "Full access — MD, CEO, CDO, CTO" },
    { name: "admin", description: "Management access — Managers, Team Leads" },
    { name: "member", description: "Standard team member access" },
    { name: "facility_owner", description: "Facility owner — can submit field data and view own facility" },
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

  // Facilities with extended fields
  const facilityData = [
    { name: "Kano Gas Plant", latitude: 12.0022, longitude: 8.5224, sector: "Oil & Gas", region: "North West", state: "Kano", lga: "Kano Municipal", operator: "NNPC", facilityType: "Gas Plant" },
    { name: "Kaduna Refinery", latitude: 10.5105, longitude: 7.435, sector: "Oil & Gas", region: "North West", state: "Kaduna", lga: "Kaduna South", operator: "NNPC", facilityType: "Refinery" },
    { name: "Abuja Gas Hub", latitude: 9.0765, longitude: 7.4913, sector: "Refinery", region: "FCT", state: "FCT", lga: "Abuja Municipal", operator: "NIPCO", facilityType: "Gas Hub" },
    { name: "Minna Flow Station", latitude: 9.6143, longitude: 6.5569, sector: "Oil & Gas", region: "North Central", state: "Niger", lga: "Chanchaga", operator: "Shell", facilityType: "Flow Station" },
    { name: "Lafia Processing Facility", latitude: 8.4855, longitude: 8.5153, sector: "Oil & Gas", region: "North Central", state: "Nasarawa", lga: "Lafia", operator: "TotalEnergies", facilityType: "Processing" },
    { name: "Enugu Coal Terminal", latitude: 6.4483, longitude: 7.5083, sector: "Coal Mining", region: "South East", state: "Enugu", lga: "Enugu South", operator: "Nigerian Coal Corp", facilityType: "Terminal" },
    { name: "Ilorin Depot", latitude: 8.4799, longitude: 4.5484, sector: "Oil & Gas", region: "North Central", state: "Kwara", lga: "Ilorin South", operator: "Mobil", facilityType: "Depot", oilBlock: "OML-23" },
    { name: "Ibadan Waste Plant", latitude: 7.3775, longitude: 3.947, sector: "Waste Management", region: "South West", state: "Oyo", lga: "Ibadan North", operator: "WeCyclers", facilityType: "Waste Plant" },
    { name: "Onitsha Tank Farm", latitude: 6.1527, longitude: 6.7865, sector: "Oil & Gas", region: "South East", state: "Anambra", lga: "Onitsha North", operator: "MRS Oil", facilityType: "Tank Farm" },
    { name: "Port Harcourt Refinery", latitude: 4.7774, longitude: 7.0085, sector: "Refinery", region: "South South", state: "Rivers", lga: "Eleme", operator: "NNPC", facilityType: "Refinery", oilBlock: "OML-11" },
    { name: "Oyo Agri Hub", latitude: 7.8504, longitude: 3.9312, sector: "Agriculture", region: "South West", state: "Oyo", lga: "Oyo West", operator: "IITA", facilityType: "Agricultural" },
    { name: "Ado Ekiti Gas Station", latitude: 7.6163, longitude: 5.2181, sector: "Oil & Gas", region: "South West", state: "Ekiti", lga: "Ado-Ekiti", operator: "Conoil", facilityType: "Gas Station" },
    { name: "Makurdi Pipeline Junction", latitude: 7.7322, longitude: 8.5307, sector: "Oil & Gas", region: "North Central", state: "Benue", lga: "Makurdi", operator: "NNPC", facilityType: "Pipeline Junction", oilBlock: "OPL-245" },
  ];

  const insertedFacilities = await db.insert(schema.facilities).values(facilityData).returning();

  // Alerts
  if (insertedFacilities.length > 0) {
    await db.insert(schema.alerts).values([
      {
        facilityId: insertedFacilities[9].id,
        title: "Delta Facility A - High Output",
        description: "Abnormally high methane output detected",
        emissionRate: 1250,
        severity: "high",
      },
      {
        facilityId: insertedFacilities[9].id,
        title: "Escravos Node - Abnormal Pressure",
        description: "Pressure anomaly detected at pipeline junction",
        emissionRate: 980,
        severity: "medium",
      },
    ]);
  }

  console.log("Seed completed successfully!");
  await pool.end();
}

seed().catch(console.error);
