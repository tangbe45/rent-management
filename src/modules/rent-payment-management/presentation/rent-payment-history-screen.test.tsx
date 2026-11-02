import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { RentalAgreement } from '../../rental-agreement-management/domain/rental-agreement';
import { getRentalAgreement } from '../../rental-agreement-management/infrastructure/composition-root';
import { Tenant } from '../../tenant-management/domain/tenant';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import { RentPayment } from '../domain/payment';
import { listRentPayments } from '../infrastructure/composition-root';
import { RentPaymentHistoryScreen } from './rent-payment-history-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listRentPayments: { execute: jest.fn() },
}));

jest.mock('../../rental-agreement-management/infrastructure/composition-root', () => ({
  getRentalAgreement: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  getTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const AMINA = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });
const KOFFI = Tenant.create({ id: 'tenant-2', fullName: 'Koffi Mensah', createdAt: 2 });

const AGREEMENT_A = RentalAgreement.create({
  id: 'agreement-a',
  tenantId: 'tenant-1',
  spaceId: 'space-1',
  startDate: '2026-01-01',
  rentAmount: 50_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2026-01-01',
  createdAt: 1,
});
const AGREEMENT_B = RentalAgreement.create({
  id: 'agreement-b',
  tenantId: 'tenant-2',
  spaceId: 'space-2',
  startDate: '2026-01-01',
  rentAmount: 80_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2026-01-01',
  createdAt: 2,
});

const PAYMENT_A = RentPayment.create({
  id: 'payment-1',
  agreementId: 'agreement-a',
  amount: 50_000,
  paymentDate: '2026-01-05',
  method: 'CASH',
  createdAt: 1,
});
const PAYMENT_B = RentPayment.create({
  id: 'payment-2',
  agreementId: 'agreement-b',
  amount: 80_000,
  paymentDate: '2026-01-02',
  method: 'MOBILE_MONEY',
  createdAt: 2,
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

function findInput(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    return props.accessibilityLabel === label && typeof props.onChangeText === 'function';
  })[0];
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<RentPaymentHistoryScreen />);
  });
  return renderer;
}

describe('RentPaymentHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listRentPayments.execute).mockReturnValue([
      { payment: PAYMENT_A, reversed: false },
      { payment: PAYMENT_B, reversed: true },
    ]);
    jest.mocked(getRentalAgreement.execute).mockImplementation((id: string) =>
      id === 'agreement-a' ? AGREEMENT_A : AGREEMENT_B,
    );
    jest.mocked(getTenant.execute).mockImplementation((input: { id: string }) =>
      input.id === 'tenant-1' ? AMINA : KOFFI,
    );
  });

  it('lists payments with their tenant, amount and reversal flag', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, 'Koffi Mensah')).toBe(true);
    expect(textContaining(root, 'Reversed')).toBe(true);
    expect(textContaining(root, '500 FCFA')).toBe(true);
    expect(textContaining(root, '800 FCFA')).toBe(true);
  });

  it('filters by tenant name', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findInput(root, 'Search by tenant name')?.props.onChangeText('koffi');
    });

    expect(textShown(root, 'Koffi Mensah')).toBe(true);
    expect(textShown(root, 'Amina Njeri')).toBe(false);
  });

  it('filters by payment method', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Mobile money')?.props.onPress();
    });

    expect(textShown(root, 'Koffi Mensah')).toBe(true);
    expect(textShown(root, 'Amina Njeri')).toBe(false);
  });

  it('opens a payment when its row is tapped', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'View payment')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/payments/payment-1');
  });

  it('shows an empty message when there are no payments', async () => {
    jest.mocked(listRentPayments.execute).mockReturnValue([]);
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'No payments recorded yet.')).toBe(true);
  });
});
