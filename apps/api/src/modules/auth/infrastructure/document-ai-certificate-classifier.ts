import { GoogleAuth, type JWTInput } from "google-auth-library";
import { config } from "../../../core/config";

const documentAiScope = "https://www.googleapis.com/auth/cloud-platform";
const documentAiBaseUrl = "documentai.googleapis.com/v1";

export type CertificateClassification = {
  type: string;
  mentionText: string | null;
  confidence: number;
};

export type CertificateClassificationResult = {
  valid: boolean;
  expectedType: string;
  minConfidence: number;
  classification: CertificateClassification | null;
  classifications: CertificateClassification[];
};

type DocumentAiEntity = {
  type?: string;
  mentionText?: string;
  confidence?: number;
};

type DocumentAiProcessResponse = {
  document?: {
    entities?: DocumentAiEntity[];
  };
};

export class CertificateClassifierConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateClassifierConfigError";
  }
}

export class CertificateClassifierRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateClassifierRequestError";
  }
}

let cachedAuth: GoogleAuth | null = null;

function parseServiceAccountCredentials(): JWTInput | undefined {
  const rawCredentials = config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
    ? Buffer.from(config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8")
    : config.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawCredentials) return undefined;

  try {
    return JSON.parse(rawCredentials) as JWTInput;
  } catch {
    throw new CertificateClassifierConfigError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
}

function getGoogleAuth(): GoogleAuth {
  if (cachedAuth) return cachedAuth;

  cachedAuth = new GoogleAuth({
    scopes: [documentAiScope],
    credentials: parseServiceAccountCredentials()
  });

  return cachedAuth;
}

function requireClassifierConfig() {
  const missingVariables = [
    ["GOOGLE_CLOUD_PROJECT_ID", config.GOOGLE_CLOUD_PROJECT_ID],
    ["GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID", config.GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0) {
    throw new CertificateClassifierConfigError(`Missing Document AI config: ${missingVariables.join(", ")}`);
  }

  return {
    projectId: config.GOOGLE_CLOUD_PROJECT_ID,
    location: config.GOOGLE_DOCUMENT_AI_LOCATION,
    processorId: config.GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID,
    processorVersionId: config.GOOGLE_DOCUMENT_AI_CLASSIFIER_VERSION_ID
  };
}

function buildProcessUrl(): string {
  const { projectId, location, processorId, processorVersionId } = requireClassifierConfig();
  const processorPath = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const versionPath = processorVersionId ? `${processorPath}/processorVersions/${processorVersionId}` : processorPath;

  return `https://${location}-${documentAiBaseUrl}/${versionPath}:process`;
}

function normalizeClassifications(entities: DocumentAiEntity[] | undefined): CertificateClassification[] {
  return (entities ?? [])
    .filter((entity) => entity.type)
    .map((entity) => ({
      type: entity.type ?? "unknown",
      mentionText: entity.mentionText ?? null,
      confidence: entity.confidence ?? 0
    }))
    .sort((left, right) => right.confidence - left.confidence);
}

export async function classifyCertificatePdf(pdfBuffer: Buffer): Promise<CertificateClassificationResult> {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const url = buildProcessUrl();
  const response = await client.request<DocumentAiProcessResponse>({
    url,
    method: "POST",
    data: {
      skipHumanReview: true,
      rawDocument: {
        mimeType: "application/pdf",
        content: pdfBuffer.toString("base64")
      },
      fieldMask: "entities"
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Document AI request failed";
    throw new CertificateClassifierRequestError(message);
  });

  const classifications = normalizeClassifications(response.data.document?.entities);
  const classification = classifications[0] ?? null;
  const expectedType = config.GOOGLE_DOCUMENT_AI_CERTIFICATE_CLASS;
  const minConfidence = config.GOOGLE_DOCUMENT_AI_MIN_CONFIDENCE;

  return {
    valid: Boolean(classification && classification.type === expectedType && classification.confidence >= minConfidence),
    expectedType,
    minConfidence,
    classification,
    classifications
  };
}
