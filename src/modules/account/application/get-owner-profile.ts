import type { AccountRepository } from '../domain/account-repository';

export interface OwnerProfile {
  fullName: string;
}

/**
 * Read-only owner identity used by the unlock screen. The application already
 * knows which single local Account exists, so the user is never asked for a
 * username, email or phone number.
 */
export class GetOwnerProfile {
  constructor(private readonly deps: { accounts: AccountRepository }) {}

  async execute(): Promise<OwnerProfile | null> {
    const account = this.deps.accounts.findFirst();
    return account === null ? null : { fullName: account.fullName };
  }
}
