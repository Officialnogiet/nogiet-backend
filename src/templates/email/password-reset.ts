export function passwordResetTemplate(name: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Arial, sans-serif; background:#f4f5f7;">
  <div style="max-width:560px; margin:40px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#009688; padding:32px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:24px; letter-spacing:1px;">NOGIET</h1>
      <p style="color:rgba(255,255,255,0.8); margin:8px 0 0; font-size:13px;">Nigerian Oil and Gas Methane Portal</p>
    </div>
    <div style="padding:40px 32px;">
      <h2 style="color:#111827; margin:0 0 16px;">Password Reset Request</h2>
      <p style="color:#6b7280; line-height:1.6;">Hi ${name},</p>
      <p style="color:#6b7280; line-height:1.6;">We received a request to reset your password. Use the verification code below:</p>
      <div style="text-align:center; margin:32px 0;">
        <div style="display:inline-block; background:#f0fdfa; border:2px solid #009688; border-radius:12px; padding:20px 40px; letter-spacing:12px; font-size:32px; font-weight:bold; color:#009688;">
          ${code}
        </div>
      </div>
      <p style="color:#6b7280; line-height:1.6;">This code expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.</p>
    </div>
    <div style="padding:20px 32px; background:#f9fafb; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">&copy; 2026 NOGIET. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
