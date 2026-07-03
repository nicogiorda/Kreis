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
  email: string;
  legajo: number;
  nombre: string;
  apellido: string;
  email_verification_token: string;
};

export type CertificateVerification = {
  token: string;
  expires_at: string;
};

export type RegistrationEmailVerification = {
  token: string;
  expires_at: string;
};

export type StartRegistrationEmailVerificationResponse = {
  status: "email_verification_sent";
  email: string;
  expires_at: string;
};

export type VerifyRegistrationEmailResponse = {
  status: "email_verified";
  email: string;
  verification: RegistrationEmailVerification;
};

export type CertificateResolvedFaculty = {
  id_facultad: number;
  nombre: string;
  sigla: string;
  nombre_detectado: string;
};

export type CertificateClassificationResponse = {
  certificate: CertificateClassificationResult;
  faculty?: CertificateResolvedFaculty;
  verification?: CertificateVerification;
};

export type RegisterInput = {
  email: string;
  password: string;
  legajo: number;
  nombre: string;
  apellido: string;
  topicos: number[];
  email_verification_token: string;
  certificate_verification_token: string;
};

export type RegisterResponse = {
  status: "account_created";
  email: string;
};

export async function listTopics(signal?: AbortSignal): Promise<TopicCatalogItem[]> {
  const response = await requestJson<{ topicos: TopicCatalogItem[] }>("/api/v1/users/topicos", { signal });
  return response.topicos;
}

export async function listFaculties(signal?: AbortSignal): Promise<FacultyCatalogItem[]> {
  const response = await requestJson<{ facultades: FacultyCatalogItem[] }>("/api/v1/users/facultades", { signal });
  return response.facultades;
}

export async function classifyCertificate(
  certificate: File,
  input: CertificateValidationInput
): Promise<CertificateClassificationResponse> {
  const formData = new FormData();
  formData.append("certificate", certificate);
  formData.append("email", input.email);
  formData.append("legajo", String(input.legajo));
  formData.append("nombre", input.nombre);
  formData.append("apellido", input.apellido);
  formData.append(
    "email_verification_token",
    input.email_verification_token
  );

  return requestFormData<CertificateClassificationResponse>(
    "/api/v1/auth/certificate/classify",
    formData
  );
}

export async function startRegistrationEmailVerification(
  email: string
): Promise<StartRegistrationEmailVerificationResponse> {
  return requestJson<StartRegistrationEmailVerificationResponse>(
    "/api/v1/auth/email-verification/start",
    {
      method: "POST",
      body: JSON.stringify({ email })
    }
  );
}

export async function verifyRegistrationEmail(
  email: string,
  code: string
): Promise<VerifyRegistrationEmailResponse> {
  return requestJson<VerifyRegistrationEmailResponse>(
    "/api/v1/auth/email-verification/verify",
    {
      method: "POST",
      body: JSON.stringify({ email, code })
    }
  );
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return requestJson<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
