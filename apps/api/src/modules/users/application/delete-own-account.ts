export type OwnAccount = {
  authId: string;
  email: string;
  legajo: number;
};

export type DeleteOwnAccountDependencies = {
  findAccount: (authId: string) => Promise<OwnAccount | null>;
  reauthenticate: (
    authId: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  deleteAuthUser: (authId: string) => Promise<boolean>;
  removeAvatar: (legajo: number) => Promise<void>;
};

export type DeleteOwnAccountErrorCode =
  | "profile_not_found"
  | "invalid_current_password"
  | "account_delete_failed";

export class DeleteOwnAccountError extends Error {
  constructor(
    public readonly code: DeleteOwnAccountErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DeleteOwnAccountError";
  }
}

export class DeleteOwnAccountUseCase {
  constructor(private readonly dependencies: DeleteOwnAccountDependencies) {}

  async execute(authId: string, password: string): Promise<void> {
    const account = await this.dependencies.findAccount(authId);
    if (!account) {
      throw new DeleteOwnAccountError(
        "profile_not_found",
        "No encontramos el perfil de la cuenta."
      );
    }

    const authenticated = await this.dependencies.reauthenticate(
      authId,
      account.email,
      password
    );
    if (!authenticated) {
      throw new DeleteOwnAccountError(
        "invalid_current_password",
        "La contraseña actual no es correcta."
      );
    }

    const deleted = await this.dependencies.deleteAuthUser(authId);
    if (!deleted) {
      throw new DeleteOwnAccountError(
        "account_delete_failed",
        "No pudimos eliminar la cuenta."
      );
    }

    await this.dependencies.removeAvatar(account.legajo).catch(() => undefined);
  }
}
