import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFlow, RecoveredPasswordFlow } from "./AuthFlow";

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyRecoveryCode: vi.fn(),
  verifySignupCode: vi.fn(),
  resendSignupCode: vi.fn(),
  updateRecoveredPassword: vi.fn(),
  completePasswordRecovery: vi.fn(),
  cancelPasswordRecovery: vi.fn(),
  signOutOtherDevices: vi.fn()
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => authMock
}));

vi.mock("../../api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../api/auth")>();

  return {
    ...original,
    listTopics: vi.fn().mockResolvedValue([]),
    listFaculties: vi.fn().mockResolvedValue([])
  };
});

async function openRecoveryCodeScreen() {
  const user = userEvent.setup();
  render(<AuthFlow initialStep="login" />);

  await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
  const emailInput = screen.getByRole("textbox", { name: "Correo electrónico" });
  await user.type(emailInput, " Student@UADE.edu.ar ");
  await user.click(screen.getByRole("button", { name: "Enviar código" }));

  await screen.findByRole("textbox", { name: "Código de recuperación" });
  return user;
}

describe("AuthFlow legal links", () => {
  it("opens the public legal documents outside the app", () => {
    render(<AuthFlow />);

    const termsLink = screen.getByRole("link", {
      name: "Términos y condiciones"
    });
    const privacyLink = screen.getByRole("link", {
      name: "Política de privacidad"
    });

    expect(termsLink).toHaveAttribute("href", "/terminos");
    expect(privacyLink).toHaveAttribute("href", "/privacidad");

    for (const link of [termsLink, privacyLink]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});

describe("AuthFlow password recovery", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    authMock.requestPasswordReset.mockResolvedValue(undefined);
    authMock.verifyRecoveryCode.mockResolvedValue(undefined);
    authMock.updateRecoveredPassword.mockResolvedValue(undefined);
    authMock.completePasswordRecovery.mockResolvedValue(undefined);
    authMock.cancelPasswordRecovery.mockResolvedValue(undefined);
    authMock.signOutOtherDevices.mockResolvedValue(undefined);
  });

  it("validates email and always shows a neutral response", async () => {
    const user = userEvent.setup();
    render(<AuthFlow initialStep="login" />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    const sendButton = screen.getByRole("button", { name: "Enviar código" });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "student@uade.edu.ar");
    expect(sendButton).toBeEnabled();
    await user.click(sendButton);

    expect(authMock.requestPasswordReset).toHaveBeenCalledWith("student@uade.edu.ar");
    expect(await screen.findByText("Si existe una cuenta asociada, te enviamos un código.")).toBeInTheDocument();
  });

  it("shows network and rate-limit request errors without revealing account existence", async () => {
    const user = userEvent.setup();
    authMock.requestPasswordReset.mockRejectedValueOnce({ status: 429 });
    render(<AuthFlow initialStep="login" />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "student@uade.edu.ar");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esperá un momento");
    expect(screen.queryByText(/no existe una cuenta/i)).not.toBeInTheDocument();
  });

  it("shows a recoverable message when the request fails without a server response", async () => {
    const user = userEvent.setup();
    authMock.requestPasswordReset.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AuthFlow initialStep="login" />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "student@uade.edu.ar");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá tu conexión");
  });

  it("opens signup verification when login reports an unconfirmed email", async () => {
    const user = userEvent.setup();
    authMock.signIn.mockRejectedValueOnce({ code: "email_not_confirmed" });
    render(<AuthFlow initialStep="login" />);

    await user.type(screen.getByRole("textbox", { name: "Ingresa tu mail" }), "student@uade.edu.ar");
    await user.type(screen.getByLabelText("Ingresa tu contraseña"), "secure-password");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("VERIFICÁ TU CORREO")).toBeInTheDocument();
    expect(screen.getByText(/student@uade.edu.ar/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("secure-password")).not.toBeInTheDocument();
  });

  it("uses one real OTP input, accepts paste, and keeps only six digits", async () => {
    const user = await openRecoveryCodeScreen();
    const codeInput = screen.getByRole("textbox", { name: "Código de recuperación" });

    await user.click(codeInput);
    await user.paste("12a34 56789");

    expect(codeInput).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Validar código" }));
    expect(authMock.verifyRecoveryCode).toHaveBeenCalledWith("student@uade.edu.ar", "123456");
  });

  it("shows an expired-code message without logging or leaving the screen", async () => {
    const user = await openRecoveryCodeScreen();
    authMock.verifyRecoveryCode.mockRejectedValueOnce({ code: "otp_expired" });

    await user.type(screen.getByRole("textbox", { name: "Código de recuperación" }), "123456");
    await user.click(screen.getByRole("button", { name: "Validar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El código venció");
  });

  it.each([
    [{ code: "otp_used" }, "ya fue utilizado"],
    [{ code: "otp_invalid" }, "no es válido"]
  ])("handles invalid or used OTP responses", async (rejection, expectedMessage) => {
    const user = await openRecoveryCodeScreen();
    authMock.verifyRecoveryCode.mockRejectedValueOnce(rejection);

    await user.type(screen.getByRole("textbox", { name: "Código de recuperación" }), "123456");
    await user.click(screen.getByRole("button", { name: "Validar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(expectedMessage);
  });

  it("blocks resend for sixty seconds and prevents an early second request", async () => {
    vi.useFakeTimers();
    render(<AuthFlow initialStep="login" />);

    fireEvent.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Correo electrónico" }), {
      target: { value: "student@uade.edu.ar" }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    });

    const resendButton = screen.getByRole("button", { name: "Reenviar en 00:60" });
    expect(resendButton).toBeDisabled();

    for (let second = 0; second < 60; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }

    const enabledResend = screen.getByRole("button", { name: "¿No te llegó? Reenviar código" });
    expect(enabledResend).toBeEnabled();
    await act(async () => {
      fireEvent.click(enabledResend);
    });
    expect(authMock.requestPasswordReset).toHaveBeenCalledTimes(2);
  });
});

describe("RecoveredPasswordFlow", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    authMock.updateRecoveredPassword.mockResolvedValue(undefined);
    authMock.completePasswordRecovery.mockResolvedValue(undefined);
    authMock.cancelPasswordRecovery.mockResolvedValue(undefined);
    authMock.signOutOtherDevices.mockResolvedValue(undefined);
  });

  it("updates the password, closes other sessions, and waits for explicit completion", async () => {
    const user = userEvent.setup();
    render(<RecoveredPasswordFlow onCancelToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "new-password");
    await user.type(screen.getByLabelText("Repetir nueva contraseña"), "new-password");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(authMock.updateRecoveredPassword).toHaveBeenCalledWith("new-password");
    expect(authMock.signOutOtherDevices).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument();
    expect(authMock.completePasswordRecovery).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Entrar a Kreis" }));
    expect(authMock.completePasswordRecovery).toHaveBeenCalledTimes(1);
  });

  it("blocks weak or mismatched passwords before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<RecoveredPasswordFlow onCancelToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "short");
    await user.type(screen.getByLabelText("Repetir nueva contraseña"), "different");

    expect(screen.getByRole("button", { name: "Actualizar contraseña" })).toBeDisabled();
    expect(authMock.updateRecoveredPassword).not.toHaveBeenCalled();
  });

  it("keeps the form available when updating the password fails", async () => {
    const user = userEvent.setup();
    authMock.updateRecoveredPassword.mockRejectedValueOnce({ code: "weak_password" });
    render(<RecoveredPasswordFlow onCancelToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "new-password");
    await user.type(screen.getByLabelText("Repetir nueva contraseña"), "new-password");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("requisitos de seguridad");
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("new-password");
  });

  it("does not report a password failure when closing other sessions fails", async () => {
    const user = userEvent.setup();
    authMock.signOutOtherDevices.mockRejectedValueOnce(new Error("offline"));
    render(<RecoveredPasswordFlow onCancelToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "new-password");
    await user.type(screen.getByLabelText("Repetir nueva contraseña"), "new-password");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByText("La contraseña cambió, pero no pudimos cerrar las demás sesiones.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar cierre de sesiones" })).toBeInTheDocument();
  });

  it("cancels recovery locally before returning to login", async () => {
    const user = userEvent.setup();
    const onCancelToLogin = vi.fn();
    render(<RecoveredPasswordFlow onCancelToLogin={onCancelToLogin} />);

    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(authMock.cancelPasswordRecovery).toHaveBeenCalledTimes(1);
    expect(onCancelToLogin).toHaveBeenCalledTimes(1);
  });
});
