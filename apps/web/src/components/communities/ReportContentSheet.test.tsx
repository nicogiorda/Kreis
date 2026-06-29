import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportContentSheet } from "./ReportContentSheet";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportContentSheet", () => {
  it("lets the user choose a reason and confirms the report", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reporte: { id_reporte: "18" } }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportContentSheet
        accessToken="token"
        target={{ type: "Comentario", id: "42" }}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reportar comentario" }));
    await user.click(screen.getByRole("button", { name: /Lenguaje agresivo o acoso/i }));

    expect(await screen.findByRole("heading", { name: "Reporte enviado" })).toBeInTheDocument();
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
});
