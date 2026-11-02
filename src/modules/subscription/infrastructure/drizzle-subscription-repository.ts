import type { Database } from '../../../shared/infrastructure/database/connection';
import { subscriptions } from '../../../shared/infrastructure/database/schema/subscriptions';
import { Subscription } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';

export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Database) {}

  save(subscription: Subscription): void {
    this.db.insert(subscriptions).values({
      id: subscription.id,
      type: subscription.type,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      createdAt: subscription.createdAt,
    }).run();
  }

  findAll(): Subscription[] {
    const rows = this.db.select().from(subscriptions).all();
    return rows.map((row) =>
      Subscription.hydrate({
        id: row.id,
        type: row.type,
        startDate: row.startDate,
        endDate: row.endDate,
        createdAt: row.createdAt,
      }),
    );
  }
}