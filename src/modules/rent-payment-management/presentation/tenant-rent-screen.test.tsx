import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Tenant } from '../../tenant-management/domain/tenant';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import { RentInstallment } from '../domain/installment';
import { getRentSummary } from '../infrastructure/composition-root';
import { TenantRentScreen } from './tenant-rent-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getRentSummary: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  getTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function obligation(agreementId: string, id: string) {
  return {
    installment: RentInstallment.create({
      id,
      agreementId,
      dueDate: '2026-01-01',
      periodIndex: 0,
      amount: 50_000,
      createdAt: 1,
    }),
    paidAmount: 0,
    remainingAmount: 50_000,
    status: 'OVERDUE' as const,
  };
}

const SUMMARY_A: RentAgreementSummary = {
  agreement: {
    id: 'agreement-a',
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
  obligations: [obligation('agreement-a', 'installment-a')],
};

const SUMMARY_B: RentAgreementSummary = {
  agreement: {
    id: 'agreement-b',
    tenantId: 'tenant-1',
    spaceId: 'space-2',
    rentAmount: 70_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: '2026-01-01',
    startDate: '2026-01-01',
    effectiveEndDate: null,
  },
  totalOutstanding: 70_000,
  overdue: 0,
  dueNow: 70_000,
  nextDueDate: '2026-01-01',
  obligations: [obligation('agreement-b', 'installment-b')],
};

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some(
      (instance) =>
        typeof instance.props.children === 'string' && instance.props.children.includes(fragment),
    );
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
    renderer = create(<TenantRentScreen tenantId="tenant-1" />);
  });
  return renderer;
}

describe('TenantRentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRentSummary.execute).mockReturnValue([SUMMARY_A, SUMMARY_B]);
    jest.mocked(getTenant.execute).mockReturnValue(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
    );
  });

  it('shows one card per agreement with the tenant name', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(findButton(root, 'Record payment')).toBeDefined();
    expect(textContaining(root, '500 FCFA (Monthly)')).toBe(true);
    expect(textContaining(root, '700 FCFA (Monthly)')).toBe(true);
  });

  it('opens the first agreement when its action is tapped', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Record payment')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/agreements/agreement-a');
  });

  it('shows an empty message when the tenant has no agreements', async () => {
    jest.mocked(getRentSummary.execute).mockReturnValue([]);
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'This tenant has no rental agreements.')).toBe(true);
  });
});
