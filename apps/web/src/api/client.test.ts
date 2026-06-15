import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiNetworkError, ApiTimeoutError, requestJson } from "./client";

describe("api client", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries GET requests on network errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const request = requestJson<{ ok: boolean }>("/api/v1/example", { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1_500);
    await vi.advanceTimersByTimeAsync(4_000);

    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry mutations by default", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network down"));

    vi.stubGlobal("fetch", fetchMock);

    await expect(requestJson("/api/v1/example", { method: "POST", body: "{}" })).rejects.toBeInstanceOf(ApiNetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("raises a typed timeout error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));

    vi.stubGlobal("fetch", fetchMock);

    const request = requestJson("/api/v1/slow", { timeoutMs: 100, retries: 0 });
    const expectation = expect(request).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(100);

    await expectation;
  });

  it("includes server status on api errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "bad_request", message: "Nope" } }),
      { status: 400 }
    )));

    await expect(requestJson("/api/v1/error", { retries: 0 })).rejects.toMatchObject({
      code: "bad_request",
      message: "Nope",
      status: 400
    });
  });
});
