export class RentAgreementNotFoundError extends Error {
  constructor(id: string) {
    super(`Rental agreement "${id}" was not found.`);
    this.name = 'RentAgreementNotFoundError';
  }
}

export class RentPaymentNotFoundError extends Error {
  constructor(id: string) {
    super(`Payment "${id}" was not found.`);
    this.name = 'RentPaymentNotFoundError';
  }
}

export class RentInstallmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Rent installment "${id}" was not found.`);
    this.name = 'RentInstallmentNotFoundError';
  }
}

export class RentPaymentAlreadyReversedError extends Error {
  constructor(id: string) {
    super(`Payment "${id}" has already been reversed.`);
    this.name = 'RentPaymentAlreadyReversedError';
  }
}

export class FutureRentPaymentDateError extends Error {
  constructor() {
    super('Choose a payment date that is today or earlier.');
    this.name = 'FutureRentPaymentDateError';
  }
}

export class EmptyPaymentAllocationsError extends Error {
  constructor() {
    super('Apply the payment to at least one rent period.');
    this.name = 'EmptyPaymentAllocationsError';
  }
}

export class PaymentAllocationMismatchError extends Error {
  constructor() {
    super('The applied amounts must add up to the amount received.');
    this.name = 'PaymentAllocationMismatchError';
  }
}

export class CrossAgreementAllocationError extends Error {
  constructor() {
    super('A payment can only cover rent periods from one rental agreement.');
    this.name = 'CrossAgreementAllocationError';
  }
}

export class DuplicateAllocationError extends Error {
  constructor(installmentId: string) {
    super(`The rent period "${installmentId}" was applied more than once.`);
    this.name = 'DuplicateAllocationError';
  }
}

export class AllocationExceedsBalanceError extends Error {
  constructor(installmentId: string) {
    super(`The applied amount is greater than the remaining balance of rent period "${installmentId}".`);
    this.name = 'AllocationExceedsBalanceError';
  }
}

export class AgreementHasActivePaymentsError extends Error {
  constructor(agreementId: string) {
    super(
      `Rental agreement "${agreementId}" has recorded payments that must be reversed before its terms can change.`,
    );
    this.name = 'AgreementHasActivePaymentsError';
  }
}
