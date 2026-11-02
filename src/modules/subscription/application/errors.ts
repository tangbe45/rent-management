export class SubscriptionExpiredError extends Error {
  constructor() {
    super('Your subscription has expired. It must be renewed before this operation can continue.');
    this.name = 'SubscriptionExpiredError';
  }
}
