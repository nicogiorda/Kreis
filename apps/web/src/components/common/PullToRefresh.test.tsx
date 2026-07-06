import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "./PullToRefresh";

function dispatchTouch(
  target: Element,
  type: "touchstart" | "touchmove" | "touchend",
  clientY?: number,
  clientX = 20
): void {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true
  });
  Object.defineProperty(event, "touches", {
    value: clientY === undefined ? [] : [{ clientX, clientY }]
  });
  fireEvent(target, event);
}

function setScrollTop(value: number): void {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value
  });
  Object.defineProperty(document.documentElement, "scrollTop", {
    configurable: true,
    value
  });
  Object.defineProperty(document.body, "scrollTop", {
    configurable: true,
    value
  });
}

afterEach(() => {
  vi.useRealTimers();
  setScrollTop(0);
});

describe("PullToRefresh", () => {
  it("requires a deliberate pull from the top of the page", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh label="Actualizando" onRefresh={onRefresh}>
        <p>Contenido</p>
      </PullToRefresh>
    );
    const root = container.querySelector(".pull-to-refresh")!;

    dispatchTouch(root, "touchstart", 100);
    dispatchTouch(root, "touchmove", 150);
    dispatchTouch(root, "touchend");

    expect(onRefresh).not.toHaveBeenCalled();

    setScrollTop(12);
    dispatchTouch(root, "touchstart", 100);
    dispatchTouch(root, "touchmove", 280);
    dispatchTouch(root, "touchend");

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("refreshes after crossing the threshold and always settles at the origin", async () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh label="Actualizando eventos" onRefresh={onRefresh}>
        <p>Contenido</p>
      </PullToRefresh>
    );
    const root = container.querySelector(".pull-to-refresh")!;
    const content = container.querySelector<HTMLElement>(".pull-to-refresh__content")!;
    const indicator = container.querySelector<HTMLElement>(".pull-to-refresh__indicator")!;

    dispatchTouch(root, "touchstart", 100);
    dispatchTouch(root, "touchmove", 260);
    dispatchTouch(root, "touchend");

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(indicator).toHaveAttribute("data-state", "refreshing");
    expect(screen.getByRole("status")).toHaveTextContent("Actualizando eventos");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(indicator).toHaveAttribute("data-state", "idle");
    expect(content.style.transform).toBe("translate3d(0, 0px, 0)");
  });
});
