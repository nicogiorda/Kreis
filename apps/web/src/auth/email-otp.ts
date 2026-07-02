export const SUPABASE_EMAIL_OTP_LENGTH = 6;

export function normalizeEmailOtp(code: string): string {
  return code.replace(/\D/g, "").slice(0, SUPABASE_EMAIL_OTP_LENGTH);
}
