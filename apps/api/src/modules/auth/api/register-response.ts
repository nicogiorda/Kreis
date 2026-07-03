export type AccountCreatedResponse = {
  status: "account_created";
  email: string;
};

export function createAccountCreatedResponse(
  email: string
): AccountCreatedResponse {
  return {
    status: "account_created",
    email: email.trim().toLowerCase()
  };
}
