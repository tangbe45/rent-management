import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { authenticationSession } from '../../infrastructure/composition-root';
import { getSubscriptionStatus } from '../../../subscription/infrastructure/composition-root';
import { DashboardScreen } from './dashboard-screen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));

jest.mock('../../infrastructure/composition-root', () => ({
  authenticationSession: { isAuthenticated: jest.fn(), lock: jest.fn() },
}));

jest.mock('../../../subscription/infrastructure/composition-root', () => ({
  getSubscriptionStatus: { execute: jest.fn() },
}));

function findButtons(root: ReactTestInstance, label: string): ReactTestInstance[] {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some(
      (instance) =>
        typeof instance.props.children === 'string' && instance.props.children.includes(fragment),
    );
}

async function renderDashboardScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<DashboardScreen />);
  });
  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSubscriptionStatus.execute).mockReturnValue({
    state: 'ACTIVE',
    active: true,
    today: '2026-10-08',
    type: 'TRIAL',
    startDate: '2026-10-08',
    endDate: '2026-11-06',
  });
});

describe('DashboardScreen', () => {
  it('renders the authenticated placeholder with an explicit lock action', async () => {
    const { root } = await renderDashboardScreen();

    expect(textShown(root, 'Dashboard')).toBe(true);
    expect(findButtons(root, 'Lock application')).toHaveLength(1);
    expect(findButtons(root, 'Lock application')[0]!.props.accessibilityRole).toBe('button');
  });

  it('communicates an active trial without blocking anything', async () => {
    const { root } = await renderDashboardScreen();

    expect(textShown(root, 'Your free trial is active until 2026-11-06.')).toBe(true);
  });

  it('explains that an expired subscription must be renewed for restricted operations', async () => {
    jest.mocked(getSubscriptionStatus.execute).mockReturnValue({
      state: 'EXPIRED',
      active: false,
      today: '2026-11-07',
      type: 'TRIAL',
      startDate: '2026-10-08',
      endDate: '2026-11-06',
    });
    const { root } = await renderDashboardScreen();

    expect(textShown(root, 'expired on 2026-11-06')).toBe(true);
    expect(textShown(root, 'must be renewed before recording rental payments')).toBe(true);
  });

  it('shows no subscription message when no subscription exists', async () => {
    jest.mocked(getSubscriptionStatus.execute).mockReturnValue({
      state: 'NONE',
      active: false,
      today: '2026-11-07',
      type: null,
      startDate: null,
      endDate: null,
    });
    const { root } = await renderDashboardScreen();

    expect(textShown(root, 'trial')).toBe(false);
    expect(textShown(root, 'subscription')).toBe(false);
  });

  it('locks the runtime session and returns to the unlock screen', async () => {
    const { root } = await renderDashboardScreen();

    await act(async () => {
      findButtons(root, 'Lock application')[0]!.props.onPress();
    });

    expect(authenticationSession.lock).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/unlock');
  });

  it('navigates to the property list', async () => {
    const { root } = await renderDashboardScreen();

    await act(async () => {
      findButtons(root, 'Manage properties')[0]!.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/properties');
  });
});