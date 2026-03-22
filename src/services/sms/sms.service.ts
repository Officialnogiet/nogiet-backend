import { env } from "../../config/env";
import { passwordResetSmsTemplate } from "../../templates/sms/password-reset";
import { alertSmsTemplate } from "../../templates/sms/alert";

export class SmsService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.TERMII_API_KEY ?? "";
    this.senderId = env.TERMII_SENDER_ID;
    this.baseUrl = env.TERMII_BASE_URL;
  }

  private async send(to: string, message: string) {
    if (env.NODE_ENV === "test" || !this.apiKey) {
      console.log(`[SMS] To: ${to}, Body: ${message}`);
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          to,
          from: this.senderId,
          sms: message,
          type: "plain",
          channel: "dnd",
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("Termii SMS error:", response.status, body);
      }
    } catch (err) {
      console.error("SMS send error:", err);
    }
  }

  async sendPasswordResetCode(phone: string, code: string) {
    const message = passwordResetSmsTemplate(code);
    return this.send(phone, message);
  }

  async sendAlertNotification(phone: string, facilityName: string, emissionRate: string) {
    const message = alertSmsTemplate(facilityName, emissionRate);
    return this.send(phone, message);
  }
}
