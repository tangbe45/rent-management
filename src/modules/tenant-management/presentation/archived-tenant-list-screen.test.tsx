import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Tenant } from '../domain/tenant';
import { listArchivedTenants, restoreTenant } from '../infrastructure/composition-root';
import { ArchivedTenantListScreen } from './archived-tenant-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listArchivedTenants: { execute: jest.fn() },
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

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ArchivedTenantListScreen />);
  });
  return renderer;
}

describe('ArchivedTenantListScreen', () => {
  let store: Tenant[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest.mocked(listArchivedTenants.execute).mockImplementation(() => ({
      tenants: [...store],
      total: store.length,
    }));
    jest.mocked(restoreTenant.execute).mockImplementation((input: { id: string }) => {
      const found = store.find((tenant) => tenant.id === input.id)!;
      store = store.filter((tenant) => tenant.id !== input.id);
      return found.restore(3);
    });
  });

  it('lists archived tenants and opens one by id', async () => {
    store.push(Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(2));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'View details').onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/tenants/tenant-1');
  });

  it('removes a tenant from the list after restoring it', async () => {
    store.push(Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(2));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    expect(restoreTenant.execute).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(true);
  });
});
