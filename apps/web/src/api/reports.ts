import { ApiRequestError, bearerTokenHeaders, requestJson } from "./client";

export type ReportTargetType = "Post" | "Comentario";

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
};

export type CreateReportResult = "created" | "duplicate";

export async function createReport(
  input: CreateReportInput,
  accessToken: string
): Promise<CreateReportResult> {
  try {
    await requestJson("/api/v1/reports", {
      method: "POST",
      headers: bearerTokenHeaders(accessToken),
      body: JSON.stringify({
        tipoReporte: input.targetType,
        idObjetivo: input.targetId,
        motivo: input.reason
      })
    });

    return "created";
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === "duplicate_report") {
      return "duplicate";
    }

    throw error;
  }
}
