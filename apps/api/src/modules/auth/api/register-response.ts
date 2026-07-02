export type PendingEmailVerificationResponse = {
  status: "pending_email_verification";
  email: string;
};

export function createPendingEmailVerificationResponse(
  email: string
): PendingEmailVerificationResponse {
  return {
    status: "pending_email_verification",
    email: email.trim().toLowerCase()
  };
}
