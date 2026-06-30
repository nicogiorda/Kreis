import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminReport } from "../../api/admin";
import { AdminDashboard } from "./AdminDashboard";

const adminApiMocks = vi.hoisted(() => ({
  listAdminCommunities: vi.fn(),
  listAdminEvents: vi.fn(),
  listAdminReports: vi.fn(),
  listAdminUsers: vi.fn(),
  updateAdminReportStatus: vi.fn()
}));

vi.mock("../../api/admin", async () => {
  const actual = await vi.importActual<typeof import("../../api/admin")>("../../api/admin");

  return {
    ...actual,
    ...adminApiMocks
  };
});

function createReport(id: string, reason: string, reporterLegajo: number, reporterName: string): AdminReport {
  return {
    id,
    targetType: "Comentario",
    targetId: "42",
    reason,
    status: "Pendiente",
    content: "Contenido reportado",
    authorLegajo: 10,
    communityId: "3",
    createdAt: `2026-06-30T12:0${id}:00.000Z`,
    resolvedAt: null,
    reporter: {
      legajo: reporterLegajo,
      name: reporterName,
      avatarUrl: null
    },
    moderator: null,
    author: {
      legajo: 10,
      name: "Autor Kreis",
      avatarUrl: null
    },
    community: {
      id: "3",
      name: "Comunidad UADE"
    }
  };
}

describe("AdminDashboard report cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApiMocks.listAdminCommunities.mockResolvedValue([]);
    adminApiMocks.listAdminEvents.mockResolvedValue([]);
    adminApiMocks.listAdminUsers.mockResolvedValue([]);
  });

  it("shows duplicate reports as one case and handles them together", async () => {
    const user = userEvent.setup();
    const reports = [
      createReport("1", "Spam", 11, "Vito Nava"),
      createReport("2", "Acoso", 12, "Nicolas Umansky")
    ];
    const resolvedReports = reports.map((report) => ({
      ...report,
      status: "Desestimado" as const,
      resolvedAt: "2026-06-30T13:00:00.000Z"
    }));
    adminApiMocks.listAdminReports
      .mockResolvedValueOnce(reports)
      .mockResolvedValue(resolvedReports);
    adminApiMocks.updateAdminReportStatus.mockResolvedValue(resolvedReports);

    render(
      <AdminDashboard
        accessToken="token"
        communities={[]}
        events={[]}
        onBack={vi.fn()}
        onCreateEvent={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reportes" }));

    const cardTitle = await screen.findByRole("heading", { name: "Comentario reportado" });
    const card = cardTitle.closest("article");
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText("2")).toBeInTheDocument();

    await user.click(within(card as HTMLElement).getByRole("button", { name: "Ver detalle" }));

    expect(screen.getByRole("heading", { name: "Reportes sobre este comentario" })).toBeInTheDocument();
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(screen.getByText("Acoso")).toBeInTheDocument();
    expect(screen.getByText("Nicolas Umansky, Vito Nava")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Desestimar" }));

    expect(adminApiMocks.updateAdminReportStatus).toHaveBeenCalledWith("2", "Desestimado", "token");
    expect(await screen.findByText("No hay reportes pendientes.")).toBeInTheDocument();
  });
});
