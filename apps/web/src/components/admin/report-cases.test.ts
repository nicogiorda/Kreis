import { describe, expect, it } from "vitest";
import type { AdminReport } from "../../api/admin";
import { groupAdminReports } from "./report-cases";

function createReport(overrides: Partial<AdminReport>): AdminReport {
  return {
    id: "1",
    targetType: "Comentario",
    targetId: "42",
    reason: "Spam",
    status: "Pendiente",
    content: "Contenido",
    authorLegajo: 10,
    communityId: "3",
    createdAt: "2026-06-30T12:00:00.000Z",
    resolvedAt: null,
    reporter: null,
    moderator: null,
    author: null,
    community: null,
    ...overrides
  };
}

describe("report cases", () => {
  it("groups pending reports by target and summarizes reasons and reporters", () => {
    const cases = groupAdminReports([
      createReport({
        id: "1",
        reporter: { legajo: 11, name: "Vito Nava", avatarUrl: null }
      }),
      createReport({
        id: "2",
        reason: "Acoso",
        reporter: { legajo: 12, name: "Nicolas Umansky", avatarUrl: null }
      }),
      createReport({
        id: "3",
        reason: "Spam",
        reporter: { legajo: 13, name: "Valen Mannino", avatarUrl: null }
      })
    ]);

    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      reportCount: 3,
      reasons: [
        { reason: "Spam", count: 2 },
        { reason: "Acoso", count: 1 }
      ]
    });
    expect(cases[0].reporters).toHaveLength(3);
  });

  it("keeps decisions with different statuses in separate cases", () => {
    const cases = groupAdminReports([
      createReport({ id: "1", status: "Pendiente" }),
      createReport({
        id: "2",
        status: "Desestimado",
        resolvedAt: "2026-06-30T13:00:00.000Z"
      })
    ]);

    expect(cases).toHaveLength(2);
  });

  it("reconstructs closed cases after their target foreign key is cleared", () => {
    const resolvedAt = "2026-06-30T14:00:00.000Z";
    const cases = groupAdminReports([
      createReport({ id: "1", targetId: null, status: "Resuelto", resolvedAt }),
      createReport({ id: "2", targetId: null, status: "Resuelto", resolvedAt })
    ]);

    expect(cases).toHaveLength(1);
    expect(cases[0].reportCount).toBe(2);
  });
});
