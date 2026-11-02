export interface ReceiptPaymentProjection {
  id: string;
  agreementId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  createdAt: number;
}

export interface ReceiptReversalProjection {
  paymentId: string;
  reason: string;
  explanation: string | null;
  reversedAt: number;
}

export interface ReceiptAllocationProjection {
  installmentDueDate: string;
  amount: number;
}

export interface ReceiptTenantProjection {
  fullName: string;
  phone: string | null;
}

export interface ReceiptPropertyProjection {
  name: string;
  address: string;
}

export interface ReceiptSpaceProjection {
  name: string;
  type: string;
}

/**
 * Read-only snapshot of everything a receipt needs about a payment and the
 * tenant/property/space it came from. Gathered without importing another
 * module's repositories, so Rent Payment Management stays the source of truth.
 */
export interface ReceiptContext {
  payment: ReceiptPaymentProjection;
  reversal: ReceiptReversalProjection | null;
  allocations: ReceiptAllocationProjection[];
  tenant: ReceiptTenantProjection | null;
  property: ReceiptPropertyProjection | null;
  space: ReceiptSpaceProjection | null;
}

export interface ReceiptContextLookup {
  findByPaymentId(paymentId: string): ReceiptContext | null;
  isReversed(paymentId: string): boolean;
  findReversedPaymentIds(paymentIds: readonly string[]): Set<string>;
}