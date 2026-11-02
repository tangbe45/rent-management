import { database, type Database } from '../../../shared/infrastructure/database/connection';
import { DrizzleSubscriptionRepository } from '../../subscription/infrastructure/drizzle-subscription-repository';
import type {
  InitializationRepositories,
  InitializationUnitOfWork,
} from '../application/unit-of-work';
import { DrizzleAccountRepository } from './drizzle-account-repository';

export class DrizzleInitializationUnitOfWork implements InitializationUnitOfWork {
  run<T>(work: (repositories: InitializationRepositories) => T): T {
    return database.transaction((tx) => {
      const repositories: InitializationRepositories = {
        accounts: new DrizzleAccountRepository(tx as unknown as Database),
        subscriptions: new DrizzleSubscriptionRepository(tx as unknown as Database),
      };
      return work(repositories);
    });
  }
}