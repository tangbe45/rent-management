import type { Subscription } from './subscription';

export interface SubscriptionRepository {
  save(subscription: Subscription): void;
  findAll(): Subscription[];
}