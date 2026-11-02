import type { SubscriptionRepository } from '../../subscription/domain/subscription-repository';
import type { AccountRepository } from '../domain/account-repository';

export interface InitializationRepositories {
  accounts: AccountRepository;
  subscriptions: SubscriptionRepository;
}

export interface InitializationUnitOfWork {
  run<T>(work: (repositories: InitializationRepositories) => T): T;
}