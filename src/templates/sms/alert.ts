export function alertSmsTemplate(facilityName: string, emissionRate: string, dashboardUrl?: string): string {
  const link = dashboardUrl || "https://nogiet.netlify.app";
  return `NOGIET ALERT: High methane emission detected at ${facilityName} — ${emissionRate}. View details: ${link}`;
}
