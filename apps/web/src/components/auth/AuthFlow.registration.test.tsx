import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../api/auth";
import { AuthFlow } from "./AuthFlow";

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyRecoveryCode: vi.fn(),
  updateRecoveredPassword: vi.fn(),
  completePasswordRecovery: vi.fn(),
  cancelPasswordRecovery: vi.fn(),
  signOutOtherDevices: vi.fn()
}));

const apiMock = vi.hoisted(() => ({
  classifyCertificate: vi.fn(),
  listFaculties: vi.fn(),
  listTopics: vi.fn(),
  register: vi.fn()
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

async function reachCertificateScreen() {
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
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("AuthFlow certificate verification", () => {
  beforeEach(() => {
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
    apiMock.register.mockResolvedValue(undefined);
    authMock.signIn.mockResolvedValue(undefined);
  });

  it("sends email to classification and includes the issued token in register", async () => {
    const { certificate } = await reachCertificateScreen();
    await submitCertificate();

    await waitFor(() => expect(apiMock.register).toHaveBeenCalledTimes(1));
    expect(apiMock.classifyCertificate).toHaveBeenCalledWith(certificate, {
      email: "ana@uade.edu.ar",
      legajo: 123456,
      nombre: "Ana",
      apellido: "Pérez"
    });
    expect(apiMock.register).toHaveBeenCalledWith(expect.objectContaining({
      certificate_verification_token: "opaque-verification-token"
    }));
  });

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

  it("keeps the normal flow working with a valid token", async () => {
    await reachCertificateScreen();
    await submitCertificate();

    await waitFor(() => {
      expect(authMock.signIn).toHaveBeenCalledWith(
        "ana@uade.edu.ar",
        "secure-password"
      );
    });
  });
});
