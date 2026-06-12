import { requestFormData, requestJson } from "./client";
export { ApiRequestError } from "./client";

export type TopicCatalogItem = {
  id_topico: string;
  topico: string;
};

export type FacultyCatalogItem = {
  id_facultad: string;
  nombre: string;
};

export type CertificateClassification = {
  type: string;
  mentionText: string | null;
  confidence: number;
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

export type CertificateClassificationResult = {
  valid: boolean;
  classificationValid: boolean;
  expectedType: string;
  minConfidence: number;
  classification: CertificateClassification | null;
  classifications: CertificateClassification[];
  extraction: CertificateExtractionResult | null;
  validation: CertificateExtractionValidation | null;
};

export type CertificateValidationInput = {
  legajo: number;
  nombre: string;
  apellido: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  legajo: number;
  nombre: string;
  apellido: string;
  id_facultad: number;
  topicos: number[];
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  [key: string]: unknown;
};

export type AuthResult = {
  session: AuthSession;
  user: {
    id: string;
    email?: string;
  };
};

export async function listTopics(signal?: AbortSignal): Promise<TopicCatalogItem[]> {
  const response = await requestJson<{ topicos: TopicCatalogItem[] }>("/api/v1/users/topicos", { signal });
  return response.topicos;
}

export async function listFaculties(signal?: AbortSignal): Promise<FacultyCatalogItem[]> {
  const response = await requestJson<{ facultades: FacultyCatalogItem[] }>("/api/v1/users/facultades", { signal });
  return response.facultades;
}

export async function classifyCertificate(certificate: File, input: CertificateValidationInput): Promise<CertificateClassificationResult> {
  const formData = new FormData();
  formData.append("certificate", certificate);
  formData.append("legajo", String(input.legajo));
  formData.append("nombre", input.nombre);
  formData.append("apellido", input.apellido);

  const response = await requestFormData<{ certificate: CertificateClassificationResult }>("/api/v1/auth/certificate/classify", formData);
  return response.certificate;
}

export async function register(input: RegisterInput): Promise<void> {
  await requestJson("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return requestJson<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  return requestJson<AuthResult>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

export async function logout(): Promise<void> {
  await requestJson("/api/v1/auth/logout", {
    method: "POST"
  });
}
