import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { database } from '../../../shared/infrastructure/database/connection';
import { GetSubscriptionStatus } from '../application/get-subscription-status';
import { SubscriptionAccessPolicy } from '../application/subscription-access-policy';
import { ValidateSubscriptionPeriod } from '../application/validate-subscription-period';
import { DrizzleSubscriptionRepository } from './drizzle-subscription-repository';

const clock = new SystemClock();

export const subscriptionsRepository = new DrizzleSubscriptionRepository(database);

export const getSubscriptionStatus = new GetSubscriptionStatus({
  subscriptions: subscriptionsRepository,
  clock,
});

export const subscriptionAccessPolicy = new SubscriptionAccessPolicy({
  subscriptionStatus: getSubscriptionStatus,
});

export const validateSubscriptionPeriod = new ValidateSubscriptionPeriod({
  subscriptions: subscriptionsRepository,
});
