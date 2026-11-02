import type { Account } from './account';

export interface AccountRepository {
  save(account: Account): void;
  findFirst(): Account | null;
}