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

  // Facilities
  const facilityData = [
    { name: "Kano", latitude: 12.0022, longitude: 8.5224, sector: "Oil & Gas", region: "North West" },
    { name: "Kaduna", latitude: 10.5105, longitude: 7.435, sector: "Oil & Gas", region: "North West" },
    { name: "Abuja", latitude: 9.0765, longitude: 7.4913, sector: "Refinery", region: "FCT" },
    { name: "Minna", latitude: 9.6143, longitude: 6.5569, sector: "Oil & Gas", region: "North Central" },
    { name: "Lafia", latitude: 8.4855, longitude: 8.5153, sector: "Oil & Gas", region: "North Central" },
    { name: "Enugu", latitude: 6.4483, longitude: 7.5083, sector: "Coal Mining", region: "South East" },
    { name: "Ilorin", latitude: 8.4799, longitude: 4.5484, sector: "Oil & Gas", region: "North Central" },
    { name: "Ibadan", latitude: 7.3775, longitude: 3.947, sector: "Waste Management", region: "South West" },
    { name: "Onitsha", latitude: 6.1527, longitude: 6.7865, sector: "Oil & Gas", region: "South East" },
    { name: "Port Harcourt", latitude: 4.7774, longitude: 7.0085, sector: "Refinery", region: "South South" },
    { name: "Oyo", latitude: 7.8504, longitude: 3.9312, sector: "Agriculture", region: "South West" },
    { name: "Ado Ekiti", latitude: 7.6163, longitude: 5.2181, sector: "Oil & Gas", region: "South West" },
    { name: "Makurdi", latitude: 7.7322, longitude: 8.5307, sector: "Oil & Gas", region: "North Central" },
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
