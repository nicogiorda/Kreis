import { afterEach, describe, expect, it, vi } from "vitest";
import { createReport } from "./reports";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reports api", () => {
  it("creates a report with the API field names", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reporte: { id_reporte: "12" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createReport({
      targetType: "Comentario",
      targetId: "42",
      reason: "Lenguaje agresivo o acoso"
    }, "token")).resolves.toBe("created");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reports"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tipoReporte: "Comentario",
          idObjetivo: "42",
          motivo: "Lenguaje agresivo o acoso"
        })
      })
    );
  });

  it("treats a duplicate report as an existing successful report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "duplicate_report",
              message: "Ya reportaste este contenido"
            }
          }),
          { status: 409 }
        )
      )
    );

    await expect(createReport({
      targetType: "Post",
      targetId: "9",
      reason: "Spam o contenido enganoso"
    }, "token")).resolves.toBe("duplicate");
  });
});
