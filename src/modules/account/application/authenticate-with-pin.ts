import { Pin } from '../domain/pin';
import type { AuthenticationSession } from './authentication-session';
import type { VerifyCredential } from './verify-credential';

export interface AuthenticateWithPinInput {
  pin: string;
}

/**
 * Application-layer orchestration point for unlocking the application: it
 * validates the PIN format against the domain rules, verifies the PIN through
 * the existing credential boundary (`VerifyCredential` → `CredentialService`),
 * and on success establishes the runtime authenticated state. Presentation
 * never verifies the credential itself.
 */
export class AuthenticateWithPin {
  constructor(
    private readonly deps: {
      verifyCredential: Pick<VerifyCredential, 'execute'>;
      session: AuthenticationSession;
    },
  ) {}

  async execute(input: AuthenticateWithPinInput): Promise<boolean> {
    try {
      Pin.create(input.pin);
    } catch {
      return false;
    }

    const authenticated = await this.deps.verifyCredential.execute({ pin: input.pin });
    if (authenticated) {
      this.deps.session.authenticate();
    }
    return authenticated;
  }
}
