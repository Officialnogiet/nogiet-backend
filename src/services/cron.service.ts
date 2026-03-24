import cron from "node-cron";
import { EmissionService } from "./emission.service";

export class CronService {
  private task: ReturnType<typeof cron.schedule> | null = null;

  constructor(
    private emissionService: EmissionService,
  ) {}

  start() {
    this.task = cron.schedule("* * * * *", async () => {
      try {
        await this.checkThresholds();
      } catch (err: any) {
        console.warn("[Cron] threshold check failed:", err.message);
      }
    });
    console.log("[Cron] Threshold monitoring started (every 1 minute)");
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  private async checkThresholds() {
    const result = await this.emissionService.refreshSatelliteRegion({
      gasType: "CH4",
      page: 1,
      limit: 100,
    });

    if (result.total > 0) {
      console.log(`[Cron] Evaluated ${result.total} satellite sources for threshold alerts`);
    }
  }
}
