import { Account } from '../domain/account';
import type { AccountRepository } from '../domain/account-repository';

export interface CreateAccountInput {
  id: string;
  fullName: string;
  createdAt: number;
}

export class CreateAccount {
  constructor(private readonly deps: { accounts: AccountRepository }) {}

  execute(input: CreateAccountInput): Account {
    const account = Account.create(input);
    this.deps.accounts.save(account);
    return account;
  }
}