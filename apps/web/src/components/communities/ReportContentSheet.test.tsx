import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deletePost, deletePostComment } from "../../api/posts";
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
    const reasonButton = screen.getByRole("button", { name: /Lenguaje agresivo o acoso/i });
    await user.click(reasonButton);

    expect(reasonButton).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar reporte" }));

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

  it("uses the Kreis warm white instead of a pure white surface", () => {
    render(
      <ReportContentSheet
        accessToken="token"
        target={{ type: "Post", id: "9" }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toHaveClass("bg-kreis-lace");
    expect(screen.getByRole("dialog")).not.toHaveClass("bg-kreis-surface");
  });

  it("offers deletion instead of reporting for the user's own post", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const onPostDeleted = vi.fn((postId: string) => deletePost(postId, "token"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportContentSheet
        accessToken="token"
        canDeletePost
        target={{ type: "Post", id: "15" }}
        onPostDeleted={onPostDeleted}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Reportar publicacion" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar publicacion" }));

    expect(onPostDeleted).not.toHaveBeenCalled();
    expect(screen.getByText(/Esta accion no se puede deshacer/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onPostDeleted).toHaveBeenCalledWith("15");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("offers deletion instead of reporting for the user's own comment", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const onCommentDeleted = vi.fn((commentId: string) => deletePostComment("15", commentId, "token"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportContentSheet
        accessToken="token"
        target={{ type: "Comentario", id: "31", isOwn: true }}
        onCommentDeleted={onCommentDeleted}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Reportar comentario" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar comentario" }));

    expect(onCommentDeleted).not.toHaveBeenCalled();
    expect(screen.getByText(/Si tiene respuestas, tambien se eliminaran/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onCommentDeleted).toHaveBeenCalledWith("31");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
