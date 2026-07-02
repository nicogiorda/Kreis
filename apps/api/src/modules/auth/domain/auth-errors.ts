// CAPA DOMAIN — Errores tipados
// Vivir en domain permite que application/ y api/ los usen sin depender de
// ninguna librería externa. Los errores son parte del contrato del módulo.
// Al tener clases propias (en vez de Error genérico), la capa api/ puede
// hacer instanceof y mapear cada tipo a un código HTTP específico.

// Se lanza cuando el proveedor de auth externo (Supabase) rechaza la operación.
// Ejemplos: email ya registrado, credenciales inválidas, usuario no encontrado.
export class AuthProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthProviderError";
  }
}

// Se lanza cuando falla la creación del perfil de aplicación en la BD (Prisma).
// La capa de aplicación captura este error para hacer rollback en el proveedor auth
// antes de propagarlo hacia arriba.
export class ProfileCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileCreationError";
  }
}

export class ProfileDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileDeletionError";
  }
}

export type CertificateVerificationErrorCode =
  | "certificate_verification_required"
  | "certificate_verification_invalid"
  | "certificate_verification_expired"
  | "certificate_verification_used"
  | "certificate_verification_mismatch";

export class CertificateVerificationError extends Error {
  constructor(
    public readonly code: CertificateVerificationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CertificateVerificationError";
  }
}

export class RegistrationFinalizationError extends Error {
  constructor(message = "No pudimos finalizar el registro.") {
    super(message);
    this.name = "RegistrationFinalizationError";
  }
}

export class RegistrationRollbackError extends Error {
  constructor(message = "El registro fallo y no pudo revertirse por completo.") {
    super(message);
    this.name = "RegistrationRollbackError";
  }
}

export class RegistrationEmailDomainError extends Error {
  readonly code = "invalid_email_domain";

  constructor(message = "El correo debe pertenecer a una universidad habilitada.") {
    super(message);
    this.name = "RegistrationEmailDomainError";
  }
}
