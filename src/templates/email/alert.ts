export function alertEmailTemplate(
  recipientName: string,
  alertTitle: string,
  alertDetails: string,
  severity: string,
): string {
  const severityColor =
    severity === "critical"
      ? "#dc2626"
      : severity === "high"
        ? "#ea580c"
        : severity === "medium"
          ? "#ca8a04"
          : "#2563eb";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Arial, sans-serif; background:#f4f5f7;">
  <div style="max-width:560px; margin:40px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#009688; padding:32px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px; letter-spacing:1px;">NOGIET</h1>
      <p style="color:rgba(255,255,255,0.8); margin:8px 0 0; font-size:13px;">Emission Alert Notification</p>
    </div>
    <div style="padding:40px 32px;">
      <p style="color:#6b7280; line-height:1.6;">Dear ${recipientName},</p>
      <div style="background:#fef2f2; border-left:4px solid ${severityColor}; border-radius:8px; padding:20px; margin:24px 0;">
        <p style="margin:0 0 4px; font-weight:700; color:${severityColor}; text-transform:uppercase; font-size:12px; letter-spacing:1px;">${severity} Alert</p>
        <h2 style="color:#111827; margin:0 0 12px; font-size:18px;">${alertTitle}</h2>
        <p style="color:#374151; margin:0; line-height:1.6;">${alertDetails}</p>
      </div>
      <p style="color:#6b7280; line-height:1.6;">Please log in to the NOGIET portal to review this alert and take appropriate action.</p>
    </div>
    <div style="padding:20px 32px; background:#f9fafb; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">&copy; 2026 NOGIET. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
