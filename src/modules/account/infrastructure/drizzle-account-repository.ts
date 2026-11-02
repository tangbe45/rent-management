import type { Database } from '../../../shared/infrastructure/database/connection';
import { accounts } from '../../../shared/infrastructure/database/schema/accounts';
import { Account } from '../domain/account';
import type { AccountRepository } from '../domain/account-repository';

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: Database) {}

  save(account: Account): void {
    this.db.insert(accounts).values({
      id: account.id,
      fullName: account.fullName,
      createdAt: account.createdAt,
    }).run();
  }

  findFirst(): Account | null {
    const row = this.db.select().from(accounts).limit(1).get();
    if (!row) {
      return null;
    }
    return Account.hydrate({ id: row.id, fullName: row.fullName, createdAt: row.createdAt });
  }
}