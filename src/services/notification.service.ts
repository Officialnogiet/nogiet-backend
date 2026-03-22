import { EmissionRepository } from "../repositories/emission.repository";
import { EmailService } from "./email/email.service";
import { UserRepository } from "../repositories/user.repository";
import type { CarbonMapperSource } from "../types/index";
import type { Server as SocketIOServer } from "socket.io";

export interface AlertThresholdConfig {
  minEmissionRate: number;
}

const DEFAULT_THRESHOLDS = [
  { min: 100, severity: "critical" },
  { min: 50, severity: "high" },
  { min: 20, severity: "medium" },
] as const;

function classifySeverity(emissionRate: number, customMin?: number): string | null {
  const thresholds = customMin != null
    ? [{ min: customMin, severity: "medium" as const }, ...DEFAULT_THRESHOLDS.filter(t => t.min > customMin)]
    : DEFAULT_THRESHOLDS;

  for (const t of thresholds) {
    if (emissionRate >= t.min) return t.severity;
  }
  return null;
}

export class NotificationService {
  private customThreshold: number | null = null;
  private emailAlertsEnabled = true;

  constructor(
    private emissionRepo: EmissionRepository,
    private emailService?: EmailService,
    private userRepo?: UserRepository,
  ) {}

  setThreshold(minEmissionRate: number) {
    this.customThreshold = minEmissionRate;
  }

  setEmailAlertsEnabled(enabled: boolean) {
    this.emailAlertsEnabled = enabled;
  }

  async evaluateSatelliteSources(
    sources: CarbonMapperSource[],
    io: SocketIOServer | null
  ): Promise<number> {
    let created = 0;

    for (const src of sources) {
      const severity = classifySeverity(
        src.emission_rate,
        this.customThreshold ?? undefined,
      );
      if (!severity) continue;

      const existing = await this.emissionRepo.findAlertBySourceName(src.source_name);
      if (existing) continue;

      const alert = await this.emissionRepo.createSatelliteAlert({
        sourceName: src.source_name,
        title: `High ${src.gas} emission: ${src.source_name}`,
        description: `Satellite detected ${src.emission_rate.toFixed(1)} kg/hr from ${src.sector} sector at (${src.lat.toFixed(4)}, ${src.lon.toFixed(4)}).`,
        emissionRate: src.emission_rate,
        severity,
      });

      if (io) {
        io.emit("alert:new", alert);
      }

      if (this.emailAlertsEnabled && this.emailService && this.userRepo && (severity === "critical" || severity === "high")) {
        this.sendAlertEmails(alert.title, alert.description ?? "").catch(err =>
          console.warn("[NotificationService] email send failed:", err.message),
        );
      }

      created++;
    }

    return created;
  }

  private async sendAlertEmails(title: string, details: string) {
    if (!this.emailService || !this.userRepo) return;
    try {
      const admins = await this.userRepo.findAdminUsers();
      for (const admin of admins) {
        await this.emailService.sendAlert(admin.email, admin.fullName, title, details);
      }
    } catch (err: any) {
      console.warn("[NotificationService] failed to send alert emails:", err.message);
    }
  }
}
