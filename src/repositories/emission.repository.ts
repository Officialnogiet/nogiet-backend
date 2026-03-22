import { eq, desc, sql, and, gte, lte, lt } from "drizzle-orm";
import { facilities, groundMeasurements, alerts } from "../db/schema/index";

export class EmissionRepository {
  constructor(private db: any) {}

  // Facilities
  async findAllFacilities() {
    return this.db.select().from(facilities).orderBy(facilities.name);
  }

  async findFacilityById(id: string) {
    const [facility] = await this.db
      .select()
      .from(facilities)
      .where(eq(facilities.id, id))
      .limit(1);
    return facility ?? null;
  }

  async createFacility(data: typeof facilities.$inferInsert) {
    const [facility] = await this.db.insert(facilities).values(data).returning();
    return facility;
  }

  async deleteFacility(id: string) {
    const [deleted] = await this.db.delete(facilities).where(eq(facilities.id, id)).returning();
    return deleted ?? null;
  }

  // Ground measurements
  async submitGroundData(data: typeof groundMeasurements.$inferInsert) {
    const [measurement] = await this.db
      .insert(groundMeasurements)
      .values(data)
      .returning();
    return measurement;
  }

  async getGroundDataByFacility(facilityId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(groundMeasurements.facilityId, facilityId)];
    if (startDate) conditions.push(gte(groundMeasurements.measurementDate, startDate));
    if (endDate) conditions.push(lte(groundMeasurements.measurementDate, endDate));

    return this.db
      .select()
      .from(groundMeasurements)
      .where(and(...conditions))
      .orderBy(desc(groundMeasurements.measurementDate));
  }

  // Alerts
  async getAlerts(limit = 20) {
    return this.db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  }

  async createAlert(data: typeof alerts.$inferInsert) {
    const [alert] = await this.db.insert(alerts).values(data).returning();
    return alert;
  }

  async findAlertBySourceName(sourceName: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existing] = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.sourceName, sourceName),
          gte(alerts.createdAt, today)
        )
      )
      .limit(1);
    return existing ?? null;
  }

  async createSatelliteAlert(data: {
    sourceName: string;
    title: string;
    description?: string;
    emissionRate?: number;
    severity?: string;
  }) {
    const [alert] = await this.db
      .insert(alerts)
      .values({
        sourceName: data.sourceName,
        title: data.title,
        description: data.description,
        emissionRate: data.emissionRate,
        severity: data.severity ?? "medium",
      })
      .returning();
    return alert;
  }

  async markAlertRead(id: string) {
    const [alert] = await this.db
      .update(alerts)
      .set({ isRead: 1 })
      .where(eq(alerts.id, id))
      .returning();
    return alert ?? null;
  }

  async markAllAlertsRead() {
    return this.db
      .update(alerts)
      .set({ isRead: 1 })
      .where(eq(alerts.isRead, 0))
      .returning();
  }

  async deleteOldAlerts(olderThan: Date) {
    return this.db
      .delete(alerts)
      .where(lt(alerts.createdAt, olderThan))
      .returning();
  }

  async getUnreadAlertCount(): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.isRead, 0));
    return Number(row?.count ?? 0);
  }

  async getEmissionStats() {
    const [sourceCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(facilities);
    const [plumeCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(groundMeasurements);

    return {
      totalSources: Number(sourceCount?.count ?? 0),
      totalMeasurements: Number(plumeCount?.count ?? 0),
    };
  }
}
