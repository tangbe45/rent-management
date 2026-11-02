import { SubscriptionExpiredError } from './errors';
import type { GetSubscriptionStatus } from './get-subscription-status';

/**
 * The single subscription-access policy. The sealed expiration rule blocks
 * exactly two operations while the subscription is not active — recording a
 * new rental payment and generating a new receipt — and nothing else.
 * Everything else (authentication, navigation, viewing records, existing
 * receipts, backup, restore) stays available, so restricted use cases call
 * this policy while unrelated flows never consult it. Enforcement belongs at
 * the application boundary, not only in presentation.
 */
export class SubscriptionAccessPolicy {
  constructor(private readonly deps: { subscriptionStatus: GetSubscriptionStatus }) {}

  private isActive(): boolean {
    return this.deps.subscriptionStatus.execute().active;
  }

  canRecordRentalPayment(): boolean {
    return this.isActive();
  }

  canGenerateReceipt(): boolean {
    return this.isActive();
  }

  assertCanRecordRentalPayment(): void {
    if (!this.isActive()) {
      throw new SubscriptionExpiredError();
    }
  }

  assertCanGenerateReceipt(): void {
    if (!this.isActive()) {
      throw new SubscriptionExpiredError();
    }
  }
}
