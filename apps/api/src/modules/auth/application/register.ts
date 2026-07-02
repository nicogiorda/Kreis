import {
  CertificateVerificationError,
  RegistrationEmailDomainError,
  RegistrationFinalizationError,
  RegistrationRollbackError
} from "../domain/auth-errors";
import type {
  ICertificateVerificationRepository
} from "../domain/certificate-verification";
import { normalizeCertificateVerificationIdentity } from "../domain/certificate-verification";
import { isAllowedRegistrationEmail } from "../domain/registration-email";
import type { AuthUser, IAuthProvider, IUserRepository, RegisterInput } from "../domain/auth.types";
import {
  hashCertificateVerificationToken,
  isCertificateVerificationTokenValid
} from "../infrastructure/certificate-verification-token";

type Clock = () => Date;

type RegisterOptions = {
  allowedEmailDomains?: ReadonlySet<string>;
  clock?: Clock;
};

const claimErrorMessages = {
  invalid: "La validacion del certificado no es valida.",
  expired: "La validacion del certificado vencio. Volve a cargarlo para continuar.",
  used: "La validacion del certificado ya fue utilizada.",
  mismatch: "Los datos no coinciden con la validacion del certificado."
} as const;

export class RegisterUseCase {
  private readonly allowedEmailDomains: ReadonlySet<string>;
  private readonly clock: Clock;

  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly verificationRepository: ICertificateVerificationRepository,
    options: RegisterOptions = {}
  ) {
    this.allowedEmailDomains = options.allowedEmailDomains ?? new Set(["uade.edu.ar"]);
    this.clock = options.clock ?? (() => new Date());
  }

  async execute(input: RegisterInput): Promise<AuthUser> {
    if (!isAllowedRegistrationEmail(input.email, this.allowedEmailDomains)) {
      throw new RegistrationEmailDomainError();
    }

    const rawToken = input.certificate_verification_token;

    if (!rawToken) {
      throw new CertificateVerificationError(
        "certificate_verification_required",
        "La validacion del certificado es obligatoria."
      );
    }

    if (!isCertificateVerificationTokenValid(rawToken)) {
      throw new CertificateVerificationError(
        "certificate_verification_invalid",
        claimErrorMessages.invalid
      );
    }

    const tokenHash = hashCertificateVerificationToken(rawToken);
    const claimedAt = this.clock();
    const claim = await this.verificationRepository.claim({
      ...normalizeCertificateVerificationIdentity(input),
      tokenHash,
      claimedAt
    });

    if (claim.status !== "claimed") {
      const code = `certificate_verification_${claim.status}` as const;
      throw new CertificateVerificationError(code, claimErrorMessages[claim.status]);
    }

    let authUser: Awaited<ReturnType<IAuthProvider["createUser"]>> | null = null;
    let profileCreated = false;

    try {
      authUser = await this.authProvider.createUser(input.email, input.password);

      await this.userRepository.createProfile(authUser.id, {
        legajo: input.legajo,
        nombre: input.nombre,
        apellido: input.apellido,
        id_facultad: input.id_facultad,
        topicos: input.topicos
      });
      profileCreated = true;

      const consumed = await this.verificationRepository.consume(
        tokenHash,
        claim.claimedAt,
        this.clock()
      );

      if (!consumed) throw new RegistrationFinalizationError();

      return {
        id: authUser.id,
        email: authUser.email ?? input.email,
        legajo: input.legajo,
        nombre: input.nombre,
        apellido: input.apellido,
        idFacultad: input.id_facultad
      };
    } catch (error) {
      const rollbackResults: Promise<unknown>[] = [];

      if (authUser && profileCreated) {
        rollbackResults.push(this.userRepository.deleteProfile(authUser.id));
      }

      if (authUser) {
        rollbackResults.push(this.authProvider.deleteUser(authUser.id));
      }

      rollbackResults.push(
        this.verificationRepository.release(tokenHash, claim.claimedAt)
      );

      const results = await Promise.allSettled(rollbackResults);
      if (results.some((result) => result.status === "rejected")) {
        throw new RegistrationRollbackError();
      }

      throw error;
    }
  }
}
