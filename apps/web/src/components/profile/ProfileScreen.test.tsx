import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileScreen } from "./ProfileScreen";

function renderProfile(overrides: {
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount?: (password: string) => Promise<void>;
  onSignOutOtherDevices?: () => Promise<void>;
  onSignOutEverywhere?: () => Promise<void>;
} = {}) {
  const props = {
    profile: null,
    profileEmail: "student@uade.edu.ar",
    profileLoadStatus: "ready" as const,
    events: [],
    communities: [],
    themeMode: "light" as const,
    onOpenEventDetails: vi.fn(),
    onToggleTheme: vi.fn(),
    onUploadAvatar: vi.fn().mockResolvedValue(undefined),
    onChangePassword: overrides.onChangePassword ?? vi.fn().mockResolvedValue(undefined),
    onDeleteAccount: overrides.onDeleteAccount ?? vi.fn().mockResolvedValue(undefined),
    onSignOutOtherDevices: overrides.onSignOutOtherDevices ?? vi.fn().mockResolvedValue(undefined),
    onSignOutEverywhere: overrides.onSignOutEverywhere ?? vi.fn().mockResolvedValue(undefined),
    onLogout: vi.fn()
  };

  render(<ProfileScreen {...props} />);
  return props;
}

async function openChangePassword() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Abrir configuracion" }));
  await user.click(screen.getByRole("button", { name: "Cuenta y seguridad" }));
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
  return user;
}

async function fillPasswordForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Contraseña actual"), "old-password");
  await user.type(screen.getByLabelText("Nueva contraseña"), "new-password");
  await user.type(screen.getByLabelText("Repetir nueva contraseña"), "new-password");
}

describe("Profile account security", () => {
  it("keeps the form open and explains an incorrect current password", async () => {
    const onChangePassword = vi.fn().mockRejectedValue({ code: "invalid_credentials" });
    renderProfile({ onChangePassword });
    const user = await openChangePassword();

    await fillPasswordForm(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña actual no es correcta.");
    expect(screen.getByRole("heading", { name: "Cambiar contraseña" })).toBeInTheDocument();
  });

  it("changes the password and closes only the other sessions", async () => {
    const onChangePassword = vi.fn().mockResolvedValue(undefined);
    const onSignOutOtherDevices = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onChangePassword, onSignOutOtherDevices });
    const user = await openChangePassword();

    await fillPasswordForm(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(onChangePassword).toHaveBeenCalledWith("old-password", "new-password");
    expect(onSignOutOtherDevices).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Las demás sesiones fueron cerradas.");
  });

  it("keeps a successful password change when closing other sessions fails", async () => {
    const onSignOutOtherDevices = vi.fn().mockRejectedValue(new Error("offline"));
    renderProfile({ onSignOutOtherDevices });
    const user = await openChangePassword();

    await fillPasswordForm(user);
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Contraseña actualizada correctamente.");
    expect(screen.getByRole("button", { name: "Reintentar cierre de las demás sesiones" })).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cambiar la contraseña.")).not.toBeInTheDocument();
  });

  it("requires confirmation before signing out every device", async () => {
    const onSignOutEverywhere = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onSignOutEverywhere });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Abrir configuracion" }));
    await user.click(screen.getByRole("button", { name: "Cuenta y seguridad" }));
    await user.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    expect(onSignOutEverywhere).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onSignOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("requires the current password and the ELIMINAR phrase before deleting the account", async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onDeleteAccount });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Abrir configuracion" }));
    await user.click(screen.getByRole("button", { name: "Cuenta y seguridad" }));
    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));

    const deleteButton = screen.getByRole("button", { name: "Eliminar mi cuenta" });
    expect(deleteButton).toBeDisabled();

    await user.type(
      screen.getByLabelText("Contraseña actual", { selector: "input" }),
      "current-password"
    );
    await user.type(
      screen.getByLabelText(/confirmaci/i, { selector: "input" }),
      "eliminar"
    );
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);
    expect(onDeleteAccount).toHaveBeenCalledWith("current-password");
  });
});
