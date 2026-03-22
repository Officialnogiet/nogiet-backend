export function passwordResetSmsTemplate(code: string): string {
  return `NOGIET: Your password reset code is ${code}. Valid for 1 hour. Do not share this code.`;
}
