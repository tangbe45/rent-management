import type {
  RentInstallmentRepository,
  RentPaymentRepository,
} from '../domain/rent-payment-repository';
import type { RentalAgreementLookup } from './rental-agreement-lookup';

/**
 * Write-side repositories exposed inside a single SQLite transaction. Recording
 * a payment and its allocations, and reversing a payment, must succeed or fail
 * together.
 */
export interface RentPaymentRepositories {
  installments: RentInstallmentRepository;
  payments: RentPaymentRepository;
  agreements: RentalAgreementLookup;
}

export interface RentPaymentUnitOfWork {
  run<T>(work: (repositories: RentPaymentRepositories) => T): T;
}
