import type { RegistrationEmailVerificationMailer } from "../application/registration-email-verification";

type ResendMailerOptions = {
  apiKey: string;
  from: string;
  fetchImplementation?: typeof fetch;
};

export class ResendRegistrationEmailVerificationMailer
implements RegistrationEmailVerificationMailer {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: ResendMailerOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async sendCode(input: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<void> {
    const minutesUntilExpiry = Math.max(
      1,
      Math.ceil((input.expiresAt.getTime() - Date.now()) / 60_000)
    );
    const response = await this.fetchImplementation(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.options.from,
          to: [input.email],
          subject: "Tu codigo de verificacion de Kreis",
          text: `Tu codigo de verificacion es ${input.code}. Vence en ${minutesUntilExpiry} minutos.`,
          html: [
            "<div style=\"font-family:Arial,sans-serif;color:#2e4b3c\">",
            "<h1 style=\"font-size:24px\">Verifica tu correo</h1>",
            `<p>Tu codigo de Kreis es <strong style="font-size:28px;letter-spacing:6px">${input.code}</strong>.</p>`,
            `<p>Vence en ${minutesUntilExpiry} minutos. Si no solicitaste este codigo, ignora este mensaje.</p>`,
            "</div>"
          ].join("")
        })
      }
    );

    if (!response.ok) {
      throw new Error("Registration verification email delivery failed");
    }
  }
}
