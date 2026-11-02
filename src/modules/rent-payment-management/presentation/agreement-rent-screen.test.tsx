import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { RentalAgreement } from '../../rental-agreement-management/domain/rental-agreement';
import { getRentalAgreement } from '../../rental-agreement-management/infrastructure/composition-root';
import { Tenant } from '../../tenant-management/domain/tenant';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import { RentInstallment } from '../domain/installment';
import { RentPayment } from '../domain/payment';
import { getAgreementRent, listRentPayments } from '../infrastructure/composition-root';
import { AgreementRentScreen } from './agreement-rent-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getAgreementRent: { execute: jest.fn() },
  listRentPayments: { execute: jest.fn() },
}));

jest.mock('../../rental-agreement-management/infrastructure/composition-root', () => ({
  getRentalAgreement: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  getTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const SUMMARY: RentAgreementSummary = {
  agreement: {
    id: 'agreement-1',
    tenantId: 'tenant-1',
    spaceId: 'space-1',
    rentAmount: 50_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: '2026-01-01',
    startDate: '2026-01-01',
    effectiveEndDate: null,
  },
  totalOutstanding: 50_000,
  overdue: 50_000,
  dueNow: 50_000,
  nextDueDate: '2026-01-01',
  obligations: [
    {
      installment: RentInstallment.create({
        id: 'installment-1',
        agreementId: 'agreement-1',
        dueDate: '2026-01-01',
        periodIndex: 0,
        amount: 50_000,
        createdAt: 1,
      }),
      paidAmount: 0,
      remainingAmount: 50_000,
      status: 'OVERDUE',
    },
  ],
};

const PAYMENT = RentPayment.create({
  id: 'payment-1',
  agreementId: 'agreement-1',
  amount: 50_000,
  paymentDate: '2026-01-05',
  method: 'CASH',
  createdAt: 1,
});

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => typeof instance.props.children === 'string' && instance.props.children.includes(fragment));
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AgreementRentScreen agreementId="agreement-1" />);
  });
  return renderer;
}

describe('AgreementRentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAgreementRent.execute).mockReturnValue(SUMMARY);
    jest.mocked(listRentPayments.execute).mockReturnValue([{ payment: PAYMENT, reversed: false }]);
    jest.mocked(getRentalAgreement.execute).mockReturnValue(
      RentalAgreement.create({
        id: 'agreement-1',
        tenantId: 'tenant-1',
        spaceId: 'space-1',
        startDate: '2026-01-01',
        rentAmount: 50_000,
        rentFrequency: 'MONTHLY',
        firstRentDueDate: '2026-01-01',
        createdAt: 1,
      }),
    );
    jest.mocked(getTenant.execute).mockReturnValue(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
    );
  });

  it('shows the tenant, the obligation and the recorded payment', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, '2026-01-01')).toBe(true);
    expect(textContaining(root, '2026-01-05')).toBe(true);
    expect(textContaining(root, '500 FCFA (Monthly)')).toBe(true);
    expect(textContaining(root, '0 FCFA / 500 FCFA')).toBe(true);
  });

  it('opens the guided record flow for this agreement', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Record payment')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/agreements/agreement-1/pay');
  });

  it('shows a not-found message when the summary is missing', async () => {
    jest.mocked(getAgreementRent.execute).mockReturnValue(null);
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Rental agreement not found.')).toBe(true);
  });
});
