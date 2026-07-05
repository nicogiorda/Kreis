import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileInstallGate } from "./MobileInstallGate";

const standaloneQuery = "(display-mode: standalone)";

function mockEnvironment({
  mobile,
  standalone,
  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform = "Win32",
  maxTouchPoints = 0
}: {
  mobile: boolean;
  standalone: boolean;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === standaloneQuery ? standalone : mobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue(platform);
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints
  });
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: standalone
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "matchMedia");
  Reflect.deleteProperty(window.navigator, "maxTouchPoints");
  Reflect.deleteProperty(window.navigator, "standalone");
});

describe("MobileInstallGate", () => {
  it("lets desktop browsers render the application", () => {
    mockEnvironment({ mobile: false, standalone: false });

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );

    expect(screen.getByText("Aplicación Kreis")).toBeInTheDocument();
    expect(screen.queryByText("Instalá Kreis")).not.toBeInTheDocument();
  });

  it("shows the installation screen in a mobile browser", () => {
    mockEnvironment({
      mobile: true,
      standalone: false,
      userAgent: "Mozilla/5.0 (Linux; Android 15; Mobile)"
    });

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );

    expect(screen.getByRole("heading", { name: "Instalá Kreis" })).toBeInTheDocument();
    expect(screen.queryByText("Aplicación Kreis")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Instalar Kreis" })).toBeDisabled();
  });

  it("lets installed mobile PWAs render the application", () => {
    mockEnvironment({
      mobile: true,
      standalone: true,
      userAgent: "Mozilla/5.0 (Linux; Android 15; Mobile)"
    });

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );

    expect(screen.getByText("Aplicación Kreis")).toBeInTheDocument();
    expect(screen.queryByText("Instalá Kreis")).not.toBeInTheDocument();
  });

  it("recognizes iPadOS and displays Safari instructions without a prompt button", () => {
    mockEnvironment({
      mobile: false,
      standalone: false,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 5
    });

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );

    expect(screen.getByRole("heading", { name: "¿Tenés iPhone?" })).toBeInTheDocument();
    expect(screen.getByText("Abrí Kreis desde Safari.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar Kreis" })).not.toBeInTheDocument();
  });

  it("defers the browser prompt until the install button is pressed", async () => {
    mockEnvironment({
      mobile: true,
      standalone: false,
      userAgent: "Mozilla/5.0 (Linux; Android 15; Mobile)"
    });
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", {
      cancelable: true
    });
    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({
        outcome: "dismissed",
        platform: "web"
      })
    });
    const user = userEvent.setup();

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );
    fireEvent(window, installEvent);

    const installButton = await screen.findByRole("button", {
      name: "Instalar Kreis"
    });
    await waitFor(() => expect(installButton).toBeEnabled());
    expect(installEvent.defaultPrevented).toBe(true);

    await user.click(installButton);

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(installButton).toBeDisabled());
  });

  it("shows confirmation when the app is installed", async () => {
    mockEnvironment({
      mobile: true,
      standalone: false,
      userAgent: "Mozilla/5.0 (Linux; Android 15; Mobile)"
    });

    render(
      <MobileInstallGate>
        <p>Aplicación Kreis</p>
      </MobileInstallGate>
    );
    fireEvent(window, new Event("appinstalled"));

    expect(
      await screen.findByText(
        "La instalación está lista. Abrí Kreis desde el ícono de tu inicio."
      )
    ).toBeInTheDocument();
  });
});
