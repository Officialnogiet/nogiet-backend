export function alertSmsTemplate(facilityName: string, emissionRate: string): string {
  return `NOGIET ALERT: High emission detected at ${facilityName} - ${emissionRate}. Check portal for details.`;
}
