import {
  CertificateVerificationError,
  ProfileCreationError,
  RegistrationEmailDomainError,
  RegistrationEmailVerificationError,
  RegistrationFinalizationError,
  RegistrationRollbackError
} from "../domain/auth-errors";
import type {
  ICertificateVerificationRepository
} from "../domain/certificate-verification";
import {
  normalizeCertificateName,
  normalizeCertificateVerificationIdentity
} from "../domain/certificate-verification";
import { isAllowedRegistrationEmail } from "../domain/registration-email";
import type {
  IRegistrationEmailVerificationRepository
} from "../domain/registration-email-verification";
import type {
  IRegistrationVerificationFinalizer
} from "../domain/registration-verification-finalizer";
import type { AuthUser, IAuthProvider, IUserRepository, RegisterInput } from "../domain/auth.types";
import {
  hashCertificateVerificationToken,
  isCertificateVerificationTokenValid
} from "../infrastructure/certificate-verification-token";
import {
  hashRegistrationEmailVerificationToken,
  isRegistrationEmailVerificationTokenValid
} from "../infrastructure/registration-email-verification-token";

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

const emailClaimErrorMessages = {
  invalid: "La verificacion del correo no es valida.",
  expired: "La verificacion del correo vencio. Volve a verificar tu mail.",
  used: "La verificacion del correo ya fue utilizada.",
  mismatch: "La verificacion no corresponde al correo ingresado."
} as const;

function profileMatchesRegistration(
  profile: Awaited<ReturnType<IUserRepository["findProfile"]>>,
  input: RegisterInput,
  idFacultad: number
): boolean {
  return Boolean(
    profile &&
    profile.legajo === input.legajo &&
    profile.id_facultad === idFacultad &&
    normalizeCertificateName(profile.nombre) === normalizeCertificateName(input.nombre) &&
    normalizeCertificateName(profile.apellido) === normalizeCertificateName(input.apellido)
  );
}

export class RegisterUseCase {
  private readonly allowedEmailDomains: ReadonlySet<string>;
  private readonly clock: Clock;

  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository,
    private readonly verificationRepository: ICertificateVerificationRepository,
    private readonly emailVerificationRepository:
      IRegistrationEmailVerificationRepository,
    private readonly verificationFinalizer:
      IRegistrationVerificationFinalizer,
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
    const rawEmailToken = input.email_verification_token;

    if (!rawEmailToken) {
      throw new RegistrationEmailVerificationError(
        "email_verification_required",
        "La verificacion del correo es obligatoria."
      );
    }

    if (!isRegistrationEmailVerificationTokenValid(rawEmailToken)) {
      throw new RegistrationEmailVerificationError(
        "email_verification_invalid",
        emailClaimErrorMessages.invalid
      );
    }

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
    const emailTokenHash =
      hashRegistrationEmailVerificationToken(rawEmailToken);
    const claimedAt = this.clock();
    const emailClaim = await this.emailVerificationRepository.claim({
      email: input.email.trim().toLowerCase(),
      verificationTokenHash: emailTokenHash,
      claimedAt
    });

    if (emailClaim.status !== "claimed") {
      const code = `email_verification_${emailClaim.status}` as const;
      throw new RegistrationEmailVerificationError(
        code,
        emailClaimErrorMessages[emailClaim.status]
      );
    }

    let authUser: Awaited<ReturnType<IAuthProvider["createUser"]>> | null = null;
    let profileCreated = false;
    let certificateClaimedAt: Date | null = null;

    try {
      const claim = await this.verificationRepository.claim({
        ...normalizeCertificateVerificationIdentity(input),
        tokenHash,
        claimedAt
      });

      if (claim.status !== "claimed") {
        const code = `certificate_verification_${claim.status}` as const;
        throw new CertificateVerificationError(
          code,
          claimErrorMessages[claim.status]
        );
      }
      certificateClaimedAt = claim.claimedAt;

      const profileWithLegajo = await this.userRepository.findProfileByLegajo(
        input.legajo
      );

      if (
        profileWithLegajo &&
        profileWithLegajo.email !== input.email.trim().toLowerCase()
      ) {
        throw new ProfileCreationError("El legajo ya pertenece a otra cuenta.");
      }

      authUser = await this.authProvider.createUser(input.email, input.password);
      const existingProfile = await this.userRepository.findProfile(authUser.id);

      if (
        existingProfile &&
        !profileMatchesRegistration(existingProfile, input, claim.idFacultad)
      ) {
        throw new ProfileCreationError("El perfil pendiente no coincide con el registro.");
      }

      if (!existingProfile) {
        await this.userRepository.createProfile(authUser.id, {
          legajo: input.legajo,
          nombre: input.nombre,
          apellido: input.apellido,
          id_facultad: claim.idFacultad,
          topicos: input.topicos
        });
        profileCreated = true;
      }

      const consumed = await this.verificationFinalizer.consume({
        emailVerificationTokenHash: emailTokenHash,
        emailClaimedAt: emailClaim.claimedAt,
        certificateVerificationTokenHash: tokenHash,
        certificateClaimedAt: claim.claimedAt,
        consumedAt: this.clock()
      });

      if (!consumed) throw new RegistrationFinalizationError();

      return {
        id: authUser.id,
        email: authUser.email ?? input.email,
        legajo: input.legajo,
        nombre: input.nombre,
        apellido: input.apellido,
        idFacultad: claim.idFacultad
      };
    } catch (error) {
      const rollbackResults: Promise<unknown>[] = [];

      if (authUser && profileCreated) {
        rollbackResults.push(this.userRepository.deleteProfile(authUser.id));
      }

      if (authUser?.created) {
        rollbackResults.push(this.authProvider.deleteUser(authUser.id));
      }

      rollbackResults.push(
        this.emailVerificationRepository.release(
          emailTokenHash,
          emailClaim.claimedAt
        )
      );

      if (certificateClaimedAt) {
        rollbackResults.push(
          this.verificationRepository.release(
            tokenHash,
            certificateClaimedAt
          )
        );
      }

      const results = await Promise.allSettled(rollbackResults);
      if (results.some((result) => result.status === "rejected")) {
        throw new RegistrationRollbackError();
      }

      throw error;
    }
  }
}
