import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Tenant } from '../../tenant-management/domain/tenant';
import { getTenant, listTenants } from '../../tenant-management/infrastructure/composition-root';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import { RentInstallment } from '../domain/installment';
import {
  getAgreementRent,
  getRentSummary,
  recordRentPayment,
} from '../infrastructure/composition-root';
import { RecordRentPaymentScreen } from './record-rent-payment-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getAgreementRent: { execute: jest.fn() },
  getRentSummary: { execute: jest.fn() },
  recordRentPayment: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  getTenant: { execute: jest.fn() },
  listTenants: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const TENANT = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });

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
  overdue: 0,
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
      status: 'DUE',
    },
  ],
};

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => typeof instance.props.children === 'string' && instance.props.children.includes(fragment));
}

function findInput(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    return props.accessibilityLabel === label && typeof props.onChangeText === 'function';
  })[0];
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

async function renderScreen(
  props: { agreementId?: string; tenantId?: string } = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<RecordRentPaymentScreen {...props} />);
  });
  return renderer;
}

describe('RecordRentPaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAgreementRent.execute).mockReturnValue(SUMMARY);
    jest.mocked(getRentSummary.execute).mockReturnValue([SUMMARY]);
    jest.mocked(getTenant.execute).mockReturnValue(TENANT);
    jest.mocked(listTenants.execute).mockReturnValue({ tenants: [TENANT], total: 1 });
  });

  it('records a full payment when opened from an agreement', async () => {
    jest.mocked(recordRentPayment.execute).mockReturnValue({ id: 'payment-1' } as never);
    const renderer = await renderScreen({ agreementId: 'agreement-1' });
    const { root } = renderer;

    expect(textShown(root, 'Amina Njeri · Total outstanding: 500 FCFA')).toBe(true);

    await act(async () => {
      findInput(root, 'Amount received')?.props.onChangeText('500');
    });
    await act(async () => {
      findButton(root, 'Continue')?.props.onPress();
    });

    expect(findInput(root, 'Amount to apply 2026-01-01')).toBeDefined();
    expect(textContaining(root, '500 FCFA')).toBe(true);
    expect(textContaining(root, '0 FCFA')).toBe(true);

    await act(async () => {
      findButton(root, 'Confirm and save')?.props.onPress();
    });

    expect(recordRentPayment.execute).toHaveBeenCalledWith({
      agreementId: 'agreement-1',
      amount: 50_000,
      paymentDate: expect.any(String),
      method: 'CASH',
      reference: '',
      notes: '',
      allocations: [{ installmentId: 'installment-1', amount: 50_000 }],
    });
    expect(textContaining(root, 'Payment recorded')).toBe(true);
    expect(textShown(root, '500 FCFA')).toBe(true);
  });

  it('refuses an amount that cannot be fully applied', async () => {
    const renderer = await renderScreen({ agreementId: 'agreement-1' });
    const { root } = renderer;

    await act(async () => {
      findInput(root, 'Amount received')?.props.onChangeText('600');
    });
    await act(async () => {
      findButton(root, 'Continue')?.props.onPress();
    });

    expect(textShown(root, 'This payment cannot be fully applied to the selected rent periods.')).toBe(
      true,
    );
    expect(recordRentPayment.execute).not.toHaveBeenCalled();
    expect(findButton(root, 'Confirm and save')).toBeUndefined();
  });

  it('walks the landlord from tenant search to the money step', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Who paid?')).toBe(true);

    await act(async () => {
      findInput(root, 'Search tenant')?.props.onChangeText('Amina');
    });
    expect(listTenants.execute).toHaveBeenCalledWith({ search: 'Amina' });

    await act(async () => {
      findButton(root, 'Amina Njeri')?.props.onPress();
    });
    expect(getRentSummary.execute).toHaveBeenCalledWith({ tenantId: 'tenant-1' });

    await act(async () => {
      findButton(root, 'Record payment')?.props.onPress();
    });

    expect(textShown(root, 'Amount received')).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows a not-found message when the agreement is unknown', async () => {
    jest.mocked(getAgreementRent.execute).mockReturnValue(null);
    const renderer = await renderScreen({ agreementId: 'missing' });

    expect(textShown(renderer.root, 'Rental agreement not found.')).toBe(true);
  });
});
