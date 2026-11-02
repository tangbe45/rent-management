import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { subscriptionAccessPolicy } from '../../subscription/infrastructure/composition-root';
import { EnsureInstallments } from '../application/ensure-installments';
import { GetAgreementRent } from '../application/get-agreement-rent';
import { GetRentDashboard } from '../application/get-rent-dashboard';
import { GetRentPayment } from '../application/get-rent-payment';
import { GetRentSummary } from '../application/get-rent-summary';
import { ListRentPayments } from '../application/list-rent-payments';
import { RecordRentPayment } from '../application/record-rent-payment';
import { ResetAgreementInstallments } from '../application/reset-agreement-installments';
import { ReverseRentPayment } from '../application/reverse-rent-payment';
import {
  DrizzleRentInstallmentRepository,
  DrizzleRentPaymentRepository,
} from './drizzle-rent-payment-repository';
import { DrizzleRentPaymentUnitOfWork } from './drizzle-rent-payment-unit-of-work';
import { DrizzleRentalAgreementLookup } from './drizzle-rental-agreement-lookup';

const clock = new SystemClock();
const idGenerator = new ExpoCryptoIdGenerator();

export const rentInstallmentsRepository = new DrizzleRentInstallmentRepository(database);
export const rentPaymentsRepository = new DrizzleRentPaymentRepository(database);
export const rentAgreementsLookup = new DrizzleRentalAgreementLookup(database);
export const rentPaymentUnitOfWork = new DrizzleRentPaymentUnitOfWork();

export const ensureRentInstallments = new EnsureInstallments({
  unitOfWork: rentPaymentUnitOfWork,
  clock,
  idGenerator,
});

export const getRentDashboard = new GetRentDashboard({
  unitOfWork: rentPaymentUnitOfWork,
  clock,
  idGenerator,
});

export const getRentSummary = new GetRentSummary({
  unitOfWork: rentPaymentUnitOfWork,
  clock,
  idGenerator,
});

export const getAgreementRent = new GetAgreementRent({
  unitOfWork: rentPaymentUnitOfWork,
  clock,
  idGenerator,
});

export const recordRentPayment = new RecordRentPayment({
  unitOfWork: rentPaymentUnitOfWork,
  clock,
  idGenerator,
  subscriptionAccess: subscriptionAccessPolicy,
});

export const reverseRentPayment = new ReverseRentPayment({ unitOfWork: rentPaymentUnitOfWork, clock });

export const listRentPayments = new ListRentPayments({ payments: rentPaymentsRepository });

export const getRentPayment = new GetRentPayment({ payments: rentPaymentsRepository });

export const resetAgreementInstallments = new ResetAgreementInstallments({
  installments: rentInstallmentsRepository,
  payments: rentPaymentsRepository,
});
