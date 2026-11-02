import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import {
  rentPaymentAllocations,
  rentPaymentReversals,
  rentPayments,
} from '../../../shared/infrastructure/database/schema/rent-payments';
import { rentalAgreements } from '../../../shared/infrastructure/database/schema/rental-agreements';
import { properties } from '../../../shared/infrastructure/database/schema/properties';
import { propertySpaces } from '../../../shared/infrastructure/database/schema/property-spaces';
import { tenants } from '../../../shared/infrastructure/database/schema/tenants';
import type { ReceiptContext, ReceiptContextLookup } from '../application/receipt-context-lookup';

/**
 * Read-only cross-module reads for receipt generation. It deliberately queries
 * the rent, agreement, tenant, property and space tables directly (no foreign
 * keys exist) rather than importing other modules' repositories, keeping Rent
 * Payment Management as the source of truth for its own data.
 */
export class DrizzleReceiptContextLookup implements ReceiptContextLookup {
  constructor(private readonly db: Database) {}

  findByPaymentId(paymentId: string): ReceiptContext | null {
    const payment = this.db.select().from(rentPayments).where(eq(rentPayments.id, paymentId)).get();
    if (payment === undefined) {
      return null;
    }

    const reversal =
      this.db
        .select()
        .from(rentPaymentReversals)
        .where(eq(rentPaymentReversals.paymentId, paymentId))
        .get() ?? null;

    const allocations = this.db
      .select()
      .from(rentPaymentAllocations)
      .where(eq(rentPaymentAllocations.paymentId, paymentId))
      .all()
      .map((allocation) => ({
        installmentDueDate: allocation.installmentDueDate,
        amount: allocation.amount,
      }));

    const agreement = this.db
      .select()
      .from(rentalAgreements)
      .where(eq(rentalAgreements.id, payment.agreementId))
      .get();

    let tenant: ReceiptContext['tenant'] = null;
    let property: ReceiptContext['property'] = null;
    let space: ReceiptContext['space'] = null;

    if (agreement !== undefined) {
      const tenantRow = this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, agreement.tenantId))
        .get();
      tenant = tenantRow === undefined ? null : { fullName: tenantRow.fullName, phone: tenantRow.phone };

      const spaceRow = this.db
        .select()
        .from(propertySpaces)
        .where(eq(propertySpaces.id, agreement.spaceId))
        .get();
      space = spaceRow === undefined ? null : { name: spaceRow.name, type: spaceRow.type };

      if (spaceRow !== undefined) {
        const propertyRow = this.db
          .select()
          .from(properties)
          .where(eq(properties.id, spaceRow.propertyId))
          .get();
        property =
          propertyRow === undefined
            ? null
            : { name: propertyRow.name, address: propertyRow.address };
      }
    }

    return {
      payment: {
        id: payment.id,
        agreementId: payment.agreementId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        reference: payment.reference,
        createdAt: payment.createdAt,
      },
      reversal:
        reversal === null
          ? null
          : {
              paymentId: reversal.paymentId,
              reason: reversal.reason,
              explanation: reversal.explanation,
              reversedAt: reversal.reversedAt,
            },
      allocations,
      tenant,
      property,
      space,
    };
  }

  isReversed(paymentId: string): boolean {
    const row = this.db
      .select({ paymentId: rentPaymentReversals.paymentId })
      .from(rentPaymentReversals)
      .where(eq(rentPaymentReversals.paymentId, paymentId))
      .get();
    return row !== undefined;
  }

  findReversedPaymentIds(paymentIds: readonly string[]): Set<string> {
    if (paymentIds.length === 0) {
      return new Set();
    }
    const requested = new Set(paymentIds);
    const rows = this.db
      .select({ paymentId: rentPaymentReversals.paymentId })
      .from(rentPaymentReversals)
      .all();
    return new Set(rows.map((row) => row.paymentId).filter((paymentId) => requested.has(paymentId)));
  }
}