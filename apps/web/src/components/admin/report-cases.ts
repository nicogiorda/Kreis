import type { AdminPerson, AdminReport } from "../../api/admin";

export type AdminReportReasonSummary = {
  reason: string;
  count: number;
};

export type AdminReportCase = {
  id: string;
  representative: AdminReport;
  reports: AdminReport[];
  reportCount: number;
  reasons: AdminReportReasonSummary[];
  reporters: AdminPerson[];
};

function getReportCaseKey(report: AdminReport): string {
  if (report.targetId) {
    return `${report.status}:${report.targetType}:${report.targetId}`;
  }

  if (report.status !== "Pendiente" && report.resolvedAt) {
    return [
      report.status,
      report.targetType,
      report.resolvedAt,
      report.authorLegajo ?? "sin-autor",
      report.communityId ?? "sin-comunidad",
      report.content
    ].join(":");
  }

  return `${report.status}:${report.targetType}:reporte:${report.id}`;
}

function summarizeReasons(reports: AdminReport[]): AdminReportReasonSummary[] {
  const counts = new Map<string, number>();

  reports.forEach((report) => {
    counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1);
  });

  return Array.from(counts, ([reason, count]) => ({ reason, count }))
    .sort((first, second) => second.count - first.count || first.reason.localeCompare(second.reason));
}

function getUniqueReporters(reports: AdminReport[]): AdminPerson[] {
  const reporters = new Map<number, AdminPerson>();

  reports.forEach((report) => {
    if (report.reporter) reporters.set(report.reporter.legajo, report.reporter);
  });

  return Array.from(reporters.values());
}

export function groupAdminReports(reports: AdminReport[]): AdminReportCase[] {
  const grouped = new Map<string, AdminReport[]>();

  reports.forEach((report) => {
    const key = getReportCaseKey(report);
    const current = grouped.get(key);

    if (current) {
      current.push(report);
    } else {
      grouped.set(key, [report]);
    }
  });

  return Array.from(grouped, ([id, caseReports]) => {
    const sortedReports = [...caseReports].sort(
      (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );

    return {
      id,
      representative: sortedReports[0],
      reports: sortedReports,
      reportCount: sortedReports.length,
      reasons: summarizeReasons(sortedReports),
      reporters: getUniqueReporters(sortedReports)
    };
  }).sort(
    (first, second) =>
      new Date(second.representative.createdAt).getTime()
      - new Date(first.representative.createdAt).getTime()
  );
}
