import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerUpdateBanner } from "../components/common/ServiceWorkerUpdateBanner";
import { startServiceWorkerRegistration } from "./service-worker-updates";

const registerSW = vi.hoisted(() => vi.fn());

vi.mock("virtual:pwa-register", () => ({
  registerSW
}));

describe("service worker updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {}
    });
  });

  it("shows an update prompt and waits for user confirmation", async () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    let onNeedRefresh: (() => void) | undefined;

    registerSW.mockImplementation((options: { onNeedRefresh: () => void; onRegisteredSW: () => void }) => {
      onNeedRefresh = options.onNeedRefresh;
      options.onRegisteredSW();
      return applyUpdate;
    });

    render(<ServiceWorkerUpdateBanner />);

    act(() => startServiceWorkerRegistration());
    act(() => onNeedRefresh?.());

    expect(await screen.findByText("Hay una nueva version de Kreis.")).toBeInTheDocument();
    expect(applyUpdate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(applyUpdate).toHaveBeenCalledWith(true);
  });
});
