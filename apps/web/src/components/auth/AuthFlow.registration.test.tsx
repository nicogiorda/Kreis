import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../api/auth";
import { AuthFlow } from "./AuthFlow";

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

const apiMock = vi.hoisted(() => ({
  classifyCertificate: vi.fn(),
  listFaculties: vi.fn(),
  listTopics: vi.fn(),
  register: vi.fn(),
  startRegistrationEmailVerification: vi.fn(),
  verifyRegistrationEmail: vi.fn()
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => authMock
}));

vi.mock("../../api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../api/auth")>();

  return {
    ...original,
    ...apiMock
  };
});

const validCertificateResponse = {
  certificate: { valid: true },
  verification: {
    token: "opaque-verification-token",
    expires_at: "2099-07-02T15:15:00.000Z"
  }
};

async function reachSignupCodeScreen() {
  const user = userEvent.setup();
  render(<AuthFlow />);

  await user.click(screen.getByRole("button", { name: "Comenzar" }));
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.click(screen.getByRole("button", { name: "Registrarse" }));

  await user.selectOptions(
    screen.getByRole("combobox", { name: "Selecciona una universidad" }),
    "uade"
  );
  await user.type(screen.getByRole("textbox", { name: "Ingresa tu legajo" }), "123456");
  await user.click(screen.getByRole("button", { name: "Continuar" }));

  for (const topic of ["Tecnología", "Deportes", "Música"]) {
    await user.click(await screen.findByRole("button", { name: topic }));
  }
  await user.click(screen.getByRole("button", { name: "Continuar" }));

  await user.type(screen.getByRole("textbox", { name: "Nombre y Apellido" }), "Ana Pérez");
  await user.type(screen.getByRole("textbox", { name: "Mail universitario" }), "ana");
  await user.click(screen.getByRole("button", { name: "Continuar" }));

  await screen.findByRole("textbox", { name: "Código de verificación" });
  return user;
}

async function reachCertificateScreen() {
  const user = await reachSignupCodeScreen();

  await user.type(
    screen.getByRole("textbox", { name: "Código de verificación" }),
    "123456"
  );
  await user.click(screen.getByRole("button", { name: "Verificar correo" }));

  await user.type(screen.getByLabelText("Ingresa una contraseña"), "secure-password");
  await user.type(screen.getByLabelText("Repita la contraseña"), "secure-password");
  await user.click(screen.getByRole("button", { name: "Continuar" }));

  const certificateInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!certificateInput) throw new Error("Certificate input not found");

  const certificate = new File(["certificate"], "certificate.pdf", {
    type: "application/pdf"
  });
  await user.upload(certificateInput, certificate);

  return { user, certificate };
}

async function submitCertificate(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: "Validar" }));
}

async function failFirstRegistrationAndKeepVerification(): Promise<void> {
  apiMock.register.mockRejectedValueOnce(new Error("offline"));
  await submitCertificate();
  await screen.findByText("No pudimos conectar con el servidor. Intentá nuevamente.");
}

async function returnToProfile(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Volver" }));
  await user.click(screen.getByRole("button", { name: "Volver" }));
}

async function advanceFromProfile(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() => {
    expect(
      screen.queryByRole("textbox", { name: "Código de verificación" }) ??
        screen.queryByLabelText("Ingresa una contraseña")
    ).toBeInTheDocument();
  });

  const codeInput = screen.queryByRole("textbox", {
    name: "Código de verificación"
  });
  if (codeInput) {
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: "Verificar correo" }));
  }

  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("AuthFlow certificate verification", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    apiMock.listTopics.mockResolvedValue([
      { id_topico: "1", topico: "Tecnología" },
      { id_topico: "2", topico: "Deportes" },
      { id_topico: "3", topico: "Música" }
    ]);
    apiMock.listFaculties.mockResolvedValue([
      { id_facultad: "5", nombre: "Ingeniería" }
    ]);
    apiMock.classifyCertificate.mockResolvedValue(validCertificateResponse);
    apiMock.startRegistrationEmailVerification.mockResolvedValue({
      status: "email_verification_sent",
      email: "ana@uade.edu.ar",
      expires_at: "2099-07-02T15:00:00.000Z"
    });
    apiMock.verifyRegistrationEmail.mockResolvedValue({
      status: "email_verified",
      email: "ana@uade.edu.ar",
      verification: {
        token: "opaque-email-verification-token",
        expires_at: "2099-07-02T15:30:00.000Z"
      }
    });
    apiMock.register.mockResolvedValue({
      status: "account_created",
      email: "ana@uade.edu.ar"
    });
    authMock.signIn.mockResolvedValue(undefined);
    authMock.verifySignupCode.mockResolvedValue(undefined);
    authMock.resendSignupCode.mockResolvedValue(undefined);
  });

  it("sends email to classification and includes the issued token in register", async () => {
    const { certificate } = await reachCertificateScreen();
    await submitCertificate();

    await waitFor(() => expect(apiMock.register).toHaveBeenCalledTimes(1));
    expect(apiMock.classifyCertificate).toHaveBeenCalledWith(certificate, {
      email: "ana@uade.edu.ar",
      legajo: 123456,
      nombre: "Ana",
      apellido: "Pérez",
      email_verification_token: "opaque-email-verification-token"
    });
    expect(apiMock.register).toHaveBeenCalledWith(expect.objectContaining({
      email_verification_token: "opaque-email-verification-token",
      certificate_verification_token: "opaque-verification-token"
    }));
  }, 15_000);

  it("never calls register when classification does not issue a token", async () => {
    apiMock.classifyCertificate.mockResolvedValueOnce({
      certificate: { valid: true }
    });
    await reachCertificateScreen();
    await submitCertificate();

    expect(await screen.findByText(/No pudimos emitir la validación/)).toBeInTheDocument();
    expect(apiMock.register).not.toHaveBeenCalled();
  });

  it("invalidates the in-memory token when email changes", async () => {
    const { user } = await reachCertificateScreen();
    await failFirstRegistrationAndKeepVerification();
    await returnToProfile(user);

    const email = screen.getByRole("textbox", { name: "Mail universitario" });
    await user.clear(email);
    await user.type(email, "ana.nueva");
    await advanceFromProfile(user);
    await submitCertificate();

    await waitFor(() => expect(apiMock.classifyCertificate).toHaveBeenCalledTimes(2));
    expect(apiMock.startRegistrationEmailVerification).toHaveBeenCalledTimes(2);
    expect(apiMock.verifyRegistrationEmail).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["nombre", "María Pérez"],
    ["apellido", "Ana Gómez"]
  ])("invalidates the token when %s changes", async (_field, nextFullName) => {
    const { user } = await reachCertificateScreen();
    await failFirstRegistrationAndKeepVerification();
    await returnToProfile(user);

    const fullName = screen.getByRole("textbox", { name: "Nombre y Apellido" });
    await user.clear(fullName);
    await user.type(fullName, nextFullName);
    await advanceFromProfile(user);
    await submitCertificate();

    await waitFor(() => expect(apiMock.classifyCertificate).toHaveBeenCalledTimes(2));
  });

  it("invalidates the token when student number changes", async () => {
    const { user } = await reachCertificateScreen();
    await failFirstRegistrationAndKeepVerification();
    await returnToProfile(user);
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));

    const studentNumber = screen.getByRole("textbox", { name: "Ingresa tu legajo" });
    await user.clear(studentNumber);
    await user.type(studentNumber, "654321");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await advanceFromProfile(user);
    await submitCertificate();

    await waitFor(() => expect(apiMock.classifyCertificate).toHaveBeenCalledTimes(2));
  });

  it("invalidates the token when another PDF is selected", async () => {
    const { user } = await reachCertificateScreen();
    await failFirstRegistrationAndKeepVerification();
    const certificateInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!certificateInput) throw new Error("Certificate input not found");

    const replacement = new File(["replacement"], "replacement.pdf", {
      type: "application/pdf"
    });
    await user.upload(certificateInput, replacement);
    await submitCertificate();

    await waitFor(() => expect(apiMock.classifyCertificate).toHaveBeenCalledTimes(2));
    expect(apiMock.classifyCertificate.mock.calls[1][0]).toBe(replacement);
  });

  it("clears the token and requests a new certificate after an expired-token response", async () => {
    apiMock.register.mockRejectedValueOnce(
      new ApiRequestError(
        "certificate_verification_expired",
        "Expired",
        410
      )
    );
    await reachCertificateScreen();
    await submitCertificate();

    expect(await screen.findByText(/validación del certificado venció/)).toBeInTheDocument();
    expect(screen.getByText("Subí tu certificado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validar" })).toBeDisabled();
  });

  it("starts email verification immediately after profile", async () => {
    await reachSignupCodeScreen();

    expect(apiMock.startRegistrationEmailVerification).toHaveBeenCalledWith(
      "ana@uade.edu.ar"
    );
    expect(screen.getByText("VERIFICÁ TU CORREO")).toBeInTheDocument();
    expect(screen.getByText(/ana@uade.edu.ar/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingresa una contraseña")).not.toBeInTheDocument();
  });

  it("verifies the early code without persisting it and advances to password", async () => {
    const storageSetSpy = vi.spyOn(Storage.prototype, "setItem");
    const user = await reachSignupCodeScreen();
    await user.type(
      screen.getByRole("textbox", { name: "Código de verificación" }),
      "12a34 56"
    );
    await user.click(screen.getByRole("button", { name: "Verificar correo" }));

    expect(apiMock.verifyRegistrationEmail).toHaveBeenCalledWith(
      "ana@uade.edu.ar",
      "123456"
    );
    expect(await screen.findByLabelText("Ingresa una contraseña")).toBeInTheDocument();
    expect(storageSetSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/signup|otp|code/i),
      expect.anything()
    );
    storageSetSpy.mockRestore();
  });

  it("shows an accessible error for an invalid early code", async () => {
    apiMock.verifyRegistrationEmail.mockRejectedValueOnce(
      new ApiRequestError("email_verification_invalid", "Invalid", 400)
    );
    const user = await reachSignupCodeScreen();
    await user.type(
      screen.getByRole("textbox", { name: "Código de verificación" }),
      "123456"
    );
    await user.click(screen.getByRole("button", { name: "Verificar correo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("no es válido");
  });

  it("starts with signup resend disabled for sixty seconds", async () => {
    await reachSignupCodeScreen();
    const resendButton = screen.getByRole("button", { name: "Reenviar en 00:60" });
    expect(resendButton).toBeDisabled();
    expect(apiMock.startRegistrationEmailVerification).toHaveBeenCalledTimes(1);
  });

  it("signs in after final registration without requesting another code", async () => {
    await reachCertificateScreen();
    await submitCertificate();

    await waitFor(() =>
      expect(authMock.signIn).toHaveBeenCalledWith(
        "ana@uade.edu.ar",
        "secure-password"
      )
    );
    expect(apiMock.verifyRegistrationEmail).toHaveBeenCalledTimes(1);
    expect(authMock.verifySignupCode).not.toHaveBeenCalled();
  });

  it("returns to email verification when its token expires", async () => {
    apiMock.verifyRegistrationEmail.mockResolvedValueOnce({
      status: "email_verified",
      email: "ana@uade.edu.ar",
      verification: {
        token: "expired-email-token",
        expires_at: "2020-01-01T00:00:00.000Z"
      }
    });
    const user = await reachSignupCodeScreen();

    await user.type(
      screen.getByRole("textbox", { name: "Código de verificación" }),
      "123456"
    );
    await user.click(screen.getByRole("button", { name: "Verificar correo" }));
    await user.type(screen.getByLabelText("Ingresa una contraseña"), "secure-password");
    await user.type(screen.getByLabelText("Repita la contraseña"), "secure-password");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "verificación del correo venció"
    );
    expect(screen.getByRole("textbox", { name: "Código de verificación" })).toBeInTheDocument();
  });
});
