import { router } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ArchiveBlockedByActiveTenantRentalAgreementsError } from '../application/errors';
import { Tenant } from '../domain/tenant';
import { archiveTenant, getTenant, restoreTenant } from '../infrastructure/composition-root';
import {
  cancelLatestAlert,
  confirmLatestAlert,
  installAlertSpy,
  latestAlertMessage,
} from '../../property-management/presentation/alert-confirmation.test-support';
import { TenantDetailsScreen } from './tenant-details-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  archiveTenant: { execute: jest.fn() },
  getTenant: { execute: jest.fn() },
  restoreTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[buttons.length - 1]!.props as { onPress: () => void };
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === message);
}

async function renderScreen(tenantId = 'tenant-1'): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<TenantDetailsScreen tenantId={tenantId} />);
  });
  return renderer;
}

describe('TenantDetailsScreen', () => {
  let store: Tenant | null;

  beforeEach(() => {
    jest.clearAllMocks();
    installAlertSpy();
    store = null;
    jest.mocked(getTenant.execute).mockImplementation(() => store);
    jest.mocked(archiveTenant.execute).mockImplementation(() => {
      store = store!.archive(2);
      return store;
    });
    jest.mocked(restoreTenant.execute).mockImplementation(() => {
      store = store!.restore(3);
      return store;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a not-found state for a missing tenant', async () => {
    const renderer = await renderScreen('missing');

    expect(textShown(renderer.root, 'Tenant not found.')).toBe(true);
  });

  it('asks for confirmation before archiving the tenant', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'Archive').onPress();
    });

    expect(archiveTenant.execute).not.toHaveBeenCalled();
    expect(latestAlertMessage()).toContain('are not deleted');
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(buttons?.some((button) => button.style === 'destructive')).toBe(true);

    confirmLatestAlert();

    expect(archiveTenant.execute).toHaveBeenCalledTimes(1);
    expect(archiveTenant.execute).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(textShown(renderer.root, 'Archived')).toBe(true);
  });

  it('does nothing when the archive confirmation is cancelled', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Archive').onPress();
    });

    cancelLatestAlert();

    expect(archiveTenant.execute).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(textShown(renderer.root, 'Archived')).toBe(false);
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
  });

  it('reports when archiving is blocked by an active or upcoming rental agreement', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });
    jest.mocked(archiveTenant.execute).mockImplementation(() => {
      throw new ArchiveBlockedByActiveTenantRentalAgreementsError('tenant-1');
    });

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Archive').onPress();
    });
    confirmLatestAlert();

    expect(
      textShown(
        renderer.root,
        'This tenant cannot be archived because they have active or upcoming rental agreements.',
      ),
    ).toBe(true);
  });

  it('asks for confirmation before restoring an archived tenant', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(2);

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    expect(restoreTenant.execute).not.toHaveBeenCalled();
    expect(latestAlertMessage()).toContain('active tenant list');
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(buttons?.some((button) => button.style === 'destructive')).toBe(false);

    confirmLatestAlert();

    expect(restoreTenant.execute).toHaveBeenCalledTimes(1);
    expect(restoreTenant.execute).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(textShown(renderer.root, 'Archive')).toBe(true);
  });

  it('does nothing when the restore confirmation is cancelled', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(2);

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    cancelLatestAlert();

    expect(restoreTenant.execute).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(findButton(renderer.root, 'Restore')).toBeDefined();
    expect(textShown(renderer.root, 'Archived')).toBe(true);
  });

  it('reports a generic error when restoring fails', async () => {
    store = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(2);
    jest.mocked(restoreTenant.execute).mockImplementation(() => {
      throw new Error('restore failed');
    });

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });
    confirmLatestAlert();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
  });
});
