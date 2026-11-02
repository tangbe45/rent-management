import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { getLocale } from '../../../shared/i18n';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import type { RentDashboard } from '../application/get-rent-dashboard';
import { getRentDashboard } from '../infrastructure/composition-root';
import { RentDashboardScreen } from './rent-dashboard-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getRentDashboard: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const DASHBOARD: RentDashboard = {
  totalOverdue: 50_000,
  totalDueNow: 120_000,
  totalCollectedThisMonth: 80_000,
  attentionItems: [
    {
      agreementId: 'agreement-1',
      tenantId: 'tenant-1',
      spaceId: 'space-1',
      installmentId: 'installment-1',
      dueDate: '2026-09-01',
      remainingAmount: 50_000,
      status: 'OVERDUE',
    },
    {
      agreementId: 'agreement-2',
      tenantId: 'tenant-2',
      spaceId: 'space-2',
      installmentId: 'installment-2',
      dueDate: '2026-10-01',
      remainingAmount: 70_000,
      status: 'DUE',
    },
  ],
};

function textsShown(root: ReactTestInstance, fragment: string): number {
  return root.findAllByType(Text).filter((instance) => instance.props.children === fragment).length;
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => typeof instance.props.children === 'string' && instance.props.children.includes(fragment));
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<RentDashboardScreen />);
  });
  return renderer;
}

describe('RentDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRentDashboard.execute).mockReturnValue(DASHBOARD);
  });

  it('shows the totals and the periods that need attention', async () => {
    const root = (await renderScreen()).root;

    const locale = getLocale();
    expect(textContaining(root, formatDisplayAmount(DASHBOARD.totalOverdue, locale))).toBe(true);
    expect(textContaining(root, formatDisplayAmount(DASHBOARD.totalDueNow, locale))).toBe(true);
    expect(textContaining(root, formatDisplayAmount(DASHBOARD.totalCollectedThisMonth, locale))).toBe(
      true,
    );
    expect(textsShown(root, '2026-09-01')).toBe(1);
    expect(textsShown(root, '2026-10-01')).toBe(1);
    expect(textsShown(root, 'Overdue')).toBe(2);
    expect(textsShown(root, 'Due')).toBe(1);
  });

  it('renders attention balances as whole CFA francs with a single unit', async () => {
    const root = (await renderScreen()).root;

    expect(textsShown(root, '700 FCFA')).toBe(1);
    expect(textContaining(root, '1,200 FCFA')).toBe(true);
    expect(textContaining(root, '.00')).toBe(false);
  });

  it('opens the agreement of an attention item', async () => {
    const renderer = await renderScreen();
    const item = renderer.root.findAll(
      (instance) =>
        (instance.props as { accessibilityLabel?: string }).accessibilityLabel === 'Open agreement',
    )[0];

    await act(async () => {
      (item?.props as { onPress?: () => void } | undefined)?.onPress?.();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/agreements/agreement-1');
  });

  it('opens the record flow and the payment history', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await act(async () => {
      root
        .findAll((instance) => {
          const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
          return props.accessibilityLabel === 'Record payment' && typeof props.onPress === 'function';
        })[0]
        ?.props.onPress();
    });
    await act(async () => {
      root.findAll((instance) => {
        const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
        return props.accessibilityLabel === 'Payment history' && typeof props.onPress === 'function';
      })[0]?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/record');
    expect(router.push).toHaveBeenCalledWith('/rent/payments');
  });

  it('shows an all-clear message when nothing needs attention', async () => {
    jest.mocked(getRentDashboard.execute).mockReturnValue({ ...DASHBOARD, attentionItems: [] });
    const renderer = await renderScreen();

    expect(textContaining(renderer.root, 'Nothing needs attention')).toBe(true);
  });
});
