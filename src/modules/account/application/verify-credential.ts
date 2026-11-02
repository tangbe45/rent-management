import type { AccountRepository } from '../domain/account-repository';
import type { CredentialService } from './credential-service';

export interface VerifyCredentialInput {
  pin: string;
}

/**
 * Authenticates the single landlord against the stored PIN credential. This is
 * the application-side of the Authentication boundary; it answers "is this PIN
 * allowed to unlock the application?" without exposing the credential storage.
 */
export class VerifyCredential {
  constructor(
    private readonly deps: {
      accounts: AccountRepository;
      credentialService: CredentialService;
    },
  ) {}

  async execute(input: VerifyCredentialInput): Promise<boolean> {
    const account = this.deps.accounts.findFirst();
    if (account === null) {
      return false;
    }
    return this.deps.credentialService.verify({ accountId: account.id, pin: input.pin });
  }
}