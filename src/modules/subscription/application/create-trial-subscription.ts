import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import { Subscription } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';

export interface CreateTrialSubscriptionInput {
  id: string;
  startDate: CalendarDateString;
  createdAt: number;
}

export class CreateTrialSubscription {
  constructor(private readonly deps: { subscriptions: SubscriptionRepository }) {}

  execute(input: CreateTrialSubscriptionInput): Subscription {
    const subscription = Subscription.createTrial(input);
    this.deps.subscriptions.save(subscription);
    return subscription;
  }
}