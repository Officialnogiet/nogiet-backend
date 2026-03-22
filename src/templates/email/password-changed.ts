export function passwordChangedTemplate(name: string): string {
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
      <div style="text-align:center; margin-bottom:24px;">
        <div style="width:64px; height:64px; background:#f0fdfa; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">
          <span style="font-size:32px;">&#10003;</span>
        </div>
      </div>
      <h2 style="color:#111827; margin:0 0 16px; text-align:center;">Password Changed Successfully</h2>
      <p style="color:#6b7280; line-height:1.6;">Hi ${name},</p>
      <p style="color:#6b7280; line-height:1.6;">Your password has been changed successfully. You can now sign in with your new password.</p>
      <p style="color:#6b7280; line-height:1.6;">If you did not make this change, please contact our support team immediately.</p>
    </div>
    <div style="padding:20px 32px; background:#f9fafb; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af; font-size:12px; margin:0;">&copy; 2026 NOGIET. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
