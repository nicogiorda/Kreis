import type { AuthSession, IAuthProvider } from "../domain/auth.types";

export class RefreshSessionUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  async execute(refreshToken: string): Promise<AuthSession> {
    return this.authProvider.refreshSession(refreshToken);
  }
}
