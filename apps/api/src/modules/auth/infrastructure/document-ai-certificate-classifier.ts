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

export type CertificateExtractedField = {
  type: string;
  text: string | null;
  normalizedText: string | null;
  confidence: number;
};

export type CertificateExtractionResult = {
  institutionName: string | null;
  studentName: string | null;
  studentId: string | null;
  academicYear: string | null;
  studentRegistrationNumber: string | null;
  degreeProgram: string | null;
  facultyName: string | null;
  issueLocation: string | null;
  issueDate: string | null;
  observations: string | null;
  certificateNumber: string | null;
  fields: Record<string, CertificateExtractedField | null>;
};

export type CertificateExpectedUser = {
  legajo: number;
  nombre: string;
  apellido: string;
};

export type CertificateValidationCheck = {
  valid: boolean;
  expected: string;
  actual: string | null;
  field: string;
};

export type CertificateExtractionValidation = {
  valid: boolean;
  currentYear: number;
  errors: string[];
  checks: {
    legajo: CertificateValidationCheck;
    studentName: CertificateValidationCheck;
    issueDateYear: CertificateValidationCheck;
  };
  degreeProgram: string | null;
  facultyName: string | null;
};

export type CertificateProcessingResult = CertificateClassificationResult & {
  classificationValid: boolean;
  extraction: CertificateExtractionResult | null;
  validation: CertificateExtractionValidation | null;
};

type DocumentAiEntity = {
  type?: string;
  mentionText?: string;
  confidence?: number;
  normalizedValue?: {
    text?: string;
  };
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

function requireProcessorConfig(processorName: string, processorId: string | undefined, processorVersionId: string | undefined): { processorId: string; processorVersionId: string | undefined } {
  const missingVariables = [
    ["GOOGLE_CLOUD_PROJECT_ID", config.GOOGLE_CLOUD_PROJECT_ID],
    [processorName, processorId]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0 || !processorId) {
    throw new CertificateClassifierConfigError(`Missing Document AI config: ${missingVariables.join(", ")}`);
  }

  return {
    processorId,
    processorVersionId
  };
}

function buildProcessUrl(processorId: string, processorVersionId: string | undefined): string {
  const projectId = config.GOOGLE_CLOUD_PROJECT_ID;
  const location = config.GOOGLE_DOCUMENT_AI_LOCATION;
  const processorPath = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const versionPath = processorVersionId ? `${processorPath}/processorVersions/${processorVersionId}` : processorPath;

  return `https://${location}-${documentAiBaseUrl}/${versionPath}:process`;
}

async function processPdf(pdfBuffer: Buffer, url: string, fieldMask = "entities"): Promise<DocumentAiProcessResponse> {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const response = await client.request<DocumentAiProcessResponse>({
    url,
    method: "POST",
    data: {
      skipHumanReview: true,
      rawDocument: {
        mimeType: "application/pdf",
        content: pdfBuffer.toString("base64")
      },
      fieldMask
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Document AI request failed";
    throw new CertificateClassifierRequestError(message);
  });

  return response.data;
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

function entityToField(entity: DocumentAiEntity | undefined): CertificateExtractedField | null {
  if (!entity?.type) return null;

  return {
    type: entity.type,
    text: entity.mentionText ?? null,
    normalizedText: entity.normalizedValue?.text ?? null,
    confidence: entity.confidence ?? 0
  };
}

function findEntity(entities: DocumentAiEntity[] | undefined, type: string): DocumentAiEntity | undefined {
  return (entities ?? [])
    .filter((entity) => entity.type === type)
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))[0];
}

function fieldValue(field: CertificateExtractedField | null): string | null {
  return field?.normalizedText ?? field?.text ?? null;
}

function normalizeExtraction(entities: DocumentAiEntity[] | undefined): CertificateExtractionResult {
  const fields = {
    institution_name: entityToField(findEntity(entities, "institution_name")),
    student_name: entityToField(findEntity(entities, "student_name")),
    student_id: entityToField(findEntity(entities, "student_id")),
    academic_year: entityToField(findEntity(entities, "academic_year")),
    student_registration_number: entityToField(findEntity(entities, "student_registration_number")),
    degree_program: entityToField(findEntity(entities, "degree_program")),
    faculty_name: entityToField(findEntity(entities, "faculty_name")),
    issue_location: entityToField(findEntity(entities, "issue_location")),
    issue_date: entityToField(findEntity(entities, "issue_date")),
    observations: entityToField(findEntity(entities, "observations")),
    certificate_number: entityToField(findEntity(entities, "certificate_number"))
  };

  return {
    institutionName: fieldValue(fields.institution_name),
    studentName: fieldValue(fields.student_name),
    studentId: fieldValue(fields.student_id),
    academicYear: fieldValue(fields.academic_year),
    studentRegistrationNumber: fieldValue(fields.student_registration_number),
    degreeProgram: fieldValue(fields.degree_program),
    facultyName: fieldValue(fields.faculty_name),
    issueLocation: fieldValue(fields.issue_location),
    issueDate: fieldValue(fields.issue_date),
    observations: fieldValue(fields.observations),
    certificateNumber: fieldValue(fields.certificate_number),
    fields
  };
}

function onlyDigits(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function textTokens(value: string): string[] {
  return normalizeComparableText(value).split(" ").filter(Boolean);
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokenMatches(expectedToken: string, actualToken: string, options: { allowPrefix: boolean }): boolean {
  if (expectedToken === actualToken) return true;

  if (options.allowPrefix && expectedToken.length >= 4 && actualToken.startsWith(expectedToken)) {
    return true;
  }

  return expectedToken.length >= 5 && actualToken.length >= 5 && levenshteinDistance(expectedToken, actualToken) <= 1;
}

export function namesMatch(expected: CertificateExpectedUser, actualName: string | null): boolean {
  if (!actualName) return false;

  const actual = normalizeComparableText(actualName);
  const expectedForward = normalizeComparableText(`${expected.nombre} ${expected.apellido}`);
  const expectedReverse = normalizeComparableText(`${expected.apellido} ${expected.nombre}`);

  if (actual === expectedForward || actual === expectedReverse) return true;

  const actualTokens = textTokens(actualName);
  const expectedNameTokens = textTokens(expected.nombre);
  const expectedSurnameTokens = textTokens(expected.apellido);

  if (actualTokens.length === 0 || expectedNameTokens.length === 0 || expectedSurnameTokens.length === 0) {
    return false;
  }

  const nameMatches = expectedNameTokens.every((expectedToken) =>
    actualTokens.some((actualToken) => tokenMatches(expectedToken, actualToken, { allowPrefix: true }))
  );
  const surnameMatches = expectedSurnameTokens.every((expectedToken) =>
    actualTokens.some((actualToken) => tokenMatches(expectedToken, actualToken, { allowPrefix: false }))
  );

  return nameMatches && surnameMatches;
}

function extractYear(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const match = value?.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) return match[1];
  }

  return null;
}

function validateExtraction(extraction: CertificateExtractionResult, expectedUser: CertificateExpectedUser): CertificateExtractionValidation {
  const errors: string[] = [];
  const expectedLegajo = String(expectedUser.legajo);
  const registrationNumber = onlyDigits(extraction.studentRegistrationNumber);
  const legajoValid = registrationNumber === expectedLegajo;
  const currentYear = new Date().getFullYear();
  const issueDateField = extraction.fields.issue_date;
  const issueYear = extractYear(issueDateField?.normalizedText, issueDateField?.text, extraction.issueDate);
  const expectedName = `${expectedUser.nombre} ${expectedUser.apellido}`.trim();
  const studentNameValid = namesMatch(expectedUser, extraction.studentName);
  const issueYearValid = issueYear === String(currentYear);
  if (!legajoValid) errors.push("El legajo no coincide con el certificado.");
  if (!studentNameValid) errors.push("El nombre y apellido no coinciden con el certificado.");
  if (!issueYearValid) errors.push("El anio de emision del certificado no coincide con el anio actual.");

  return {
    valid: errors.length === 0,
    currentYear,
    errors,
    checks: {
      legajo: {
        valid: legajoValid,
        expected: expectedLegajo,
        actual: registrationNumber || null,
        field: "student_registration_number"
      },
      studentName: {
        valid: studentNameValid,
        expected: expectedName,
        actual: extraction.studentName,
        field: "student_name"
      },
      issueDateYear: {
        valid: issueYearValid,
        expected: String(currentYear),
        actual: issueYear,
        field: "issue_date"
      }
    },
    degreeProgram: extraction.degreeProgram,
    facultyName: extraction.facultyName
  };
}

export async function classifyCertificatePdf(pdfBuffer: Buffer): Promise<CertificateClassificationResult> {
  const { processorId, processorVersionId } = requireProcessorConfig(
    "GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID",
    config.GOOGLE_DOCUMENT_AI_CLASSIFIER_PROCESSOR_ID,
    config.GOOGLE_DOCUMENT_AI_CLASSIFIER_VERSION_ID
  );
  const data = await processPdf(pdfBuffer, buildProcessUrl(processorId, processorVersionId));
  const classifications = normalizeClassifications(data.document?.entities);
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

export async function extractCertificatePdf(pdfBuffer: Buffer): Promise<CertificateExtractionResult> {
  const { processorId, processorVersionId } = requireProcessorConfig(
    "GOOGLE_DOCUMENT_AI_EXTRACTOR_PROCESSOR_ID",
    config.GOOGLE_DOCUMENT_AI_EXTRACTOR_PROCESSOR_ID,
    config.GOOGLE_DOCUMENT_AI_EXTRACTOR_VERSION_ID
  );
  const data = await processPdf(pdfBuffer, buildProcessUrl(processorId, processorVersionId));

  return normalizeExtraction(data.document?.entities);
}

export async function processCertificatePdf(pdfBuffer: Buffer, expectedUser: CertificateExpectedUser): Promise<CertificateProcessingResult> {
  const classification = await classifyCertificatePdf(pdfBuffer);

  if (!classification.valid) {
    return {
      ...classification,
      classificationValid: false,
      extraction: null,
      validation: null
    };
  }

  const extraction = await extractCertificatePdf(pdfBuffer);
  const validation = validateExtraction(extraction, expectedUser);

  return {
    ...classification,
    valid: validation.valid,
    classificationValid: true,
    extraction,
    validation
  };
}
