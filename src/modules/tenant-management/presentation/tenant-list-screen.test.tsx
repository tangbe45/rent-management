import { useFocusEffect } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { TenantPage } from '../domain/tenant-repository';
import { Tenant } from '../domain/tenant';
import { listTenants } from '../infrastructure/composition-root';
import { TenantListScreen } from './tenant-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listTenants: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildTenant(id: string, fullName: string, createdAt = 1): Tenant {
  return Tenant.create({ id, fullName, createdAt });
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === fragment);
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<TenantListScreen />);
  });
  return renderer;
}

function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const callback = calls[calls.length - 1]![0];
  act(() => {
    callback();
  });
}

describe('TenantListScreen', () => {
  let store: Tenant[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest.mocked(listTenants.execute).mockImplementation(
      (query: { search?: string; offset?: number; limit?: number } = {}): TenantPage => {
        const search = (query.search ?? '').toLowerCase();
        const matching = store.filter((tenant) =>
          tenant.fullName.toLowerCase().includes(search),
        );
        const offset = query.offset ?? 0;
        const limit = query.limit ?? 1;
        return { tenants: matching.slice(offset, offset + limit), total: matching.length };
      },
    );
  });

  it('shows a tenant registered elsewhere when the screen regains focus', async () => {
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(true);

    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    emitFocus();

    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
  });

  it('filters the list through the search query', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    const input = renderer.root.findByType(TextInput);

    await act(async () => {
      input.props.onChangeText('brian');
    });

    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(false);
  });

  it('appends the next page when load more is pressed', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);

    const loadMore = renderer.root.findAll((instance) => {
      const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
      return props.accessibilityLabel === 'Load more' && typeof props.onPress === 'function';
    });
    await act(async () => {
      loadMore[loadMore.length - 1]!.props.onPress();
    });

    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
  });
});
