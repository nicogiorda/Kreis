import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteAdminUser,
  listAdminReports,
  updateAdminCommunityStatus,
  updateAdminEventStatus,
  updateAdminReportStatus
} from "./admin";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("admin api", () => {
  it("maps report targets and related people", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            reportes: [
              {
                id_reporte: "8",
                tipo_reporte: "Comentario",
                id_objetivo: "42",
                motivo: "Lenguaje agresivo",
                estado: "Pendiente",
                contenido_reportado: "Contenido",
                autor_legajo: 11,
                id_comunidad: "3",
                created_at: "2026-06-27T12:00:00.000Z",
                resuelto_at: null,
                reportante: {
                  legajo: 12,
                  nombre: "Vito",
                  apellido: "Nava",
                  avatar_url: null
                },
                moderador: null,
                objetivo: {
                  tipo: "Comentario",
                  comentario: {
                    autor: {
                      legajo: 11,
                      nombre: "Nicolas",
                      apellido: "Giordano",
                      avatar_url: null
                    },
                    post: {
                      comunidad: {
                        id_comunidad: "3",
                        nombre: "Emprendedores UADE"
                      }
                    }
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
    );

    await expect(listAdminReports("token")).resolves.toMatchObject([
      {
        id: "8",
        targetType: "Comentario",
        targetId: "42",
        author: { name: "Nicolas Giordano" },
        reporter: { name: "Vito Nava" },
        community: { id: "3", name: "Emprendedores UADE" }
      }
    ]);
  });

  it("sends publication status mutations to their moderation routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateAdminCommunityStatus("5", "Aceptado", "token");
    await updateAdminEventStatus("9", "Rechazado", "token");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/communities/admin/5/status"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "Aceptado" }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/events/admin/9/status"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "Rechazado" }) })
    );
  });

  it("uses the destructive routes only for explicit report resolution and user deletion", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            reporte: {
              id_reporte: "4",
              tipo_reporte: "Post",
              id_objetivo: null,
              motivo: "Spam",
              estado: "Resuelto",
              contenido_reportado: "Snapshot",
              autor_legajo: null,
              id_comunidad: null,
              created_at: "2026-06-27T12:00:00.000Z",
              resuelto_at: "2026-06-27T13:00:00.000Z",
              reportante: null,
              moderador: null,
              objetivo: null
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { legajo: 25, deleted: true } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateAdminReportStatus("4", "Resuelto", "token");
    await deleteAdminUser(25, "token");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/reports/admin/4/status"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "Resuelto" }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/users/admin/25"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
