import type { AccountRepository } from '../domain/account-repository';

export interface ApplicationState {
  initialized: boolean;
}

export class GetApplicationState {
  constructor(private readonly deps: { accounts: AccountRepository }) {}

  async execute(): Promise<ApplicationState> {
    const account = this.deps.accounts.findFirst();
    return { initialized: account !== null };
  }
}