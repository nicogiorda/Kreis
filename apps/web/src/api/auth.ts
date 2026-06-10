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

export type CertificateClassificationResult = {
  valid: boolean;
  expectedType: string;
  minConfidence: number;
  classification: CertificateClassification | null;
  classifications: CertificateClassification[];
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

export async function classifyCertificate(certificate: File): Promise<CertificateClassificationResult> {
  const formData = new FormData();
  formData.append("certificate", certificate);

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

export async function logout(): Promise<void> {
  await requestJson("/api/v1/auth/logout", {
    method: "POST"
  });
}
