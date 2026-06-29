import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiNetworkError,
  ApiTimeoutError,
  bearerTokenHeaders,
  registerAuthTokenRefresher,
  requestJson
} from "./client";

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

  it("refreshes the bearer token once and retries an unauthorized request", async () => {
    const refreshToken = vi.fn().mockResolvedValue("fresh-token");
    const unregister = registerAuthTokenRefresher(refreshToken);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: "invalid_token", message: "Expired" } }),
        { status: 401 }
      ))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestJson<{ ok: boolean }>("/api/v1/private", {
      headers: bearerTokenHeaders("old-token")
    })).resolves.toEqual({ ok: true });

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe("Bearer fresh-token");
    unregister();
  });

  it("shares one token refresh between concurrent unauthorized requests", async () => {
    const refreshToken = vi.fn().mockResolvedValue("fresh-token");
    const unregister = registerAuthTokenRefresher(refreshToken);
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization");
      return Promise.resolve(
        authorization === "Bearer fresh-token"
          ? new Response(JSON.stringify({ ok: true }), { status: 200 })
          : new Response(
              JSON.stringify({ error: { code: "invalid_token", message: "Expired" } }),
              { status: 401 }
            )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(Promise.all([
      requestJson("/api/v1/private-a", { headers: bearerTokenHeaders("old-token") }),
      requestJson("/api/v1/private-b", { headers: bearerTokenHeaders("old-token") })
    ])).resolves.toEqual([{ ok: true }, { ok: true }]);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    unregister();
  });
});
