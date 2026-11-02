import { router, useFocusEffect } from 'expo-router';
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

const mounted: ReactTestRenderer[] = [];

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[buttons.length - 1]!.props as { onPress: () => void };
}

function buildTenant(id: string, fullName: string, createdAt = 1): Tenant {
  return Tenant.create({ id, fullName, createdAt });
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === fragment);
}

function countText(root: ReactTestInstance, fragment: string): number {
  return root.findAllByType(Text).filter((instance) => instance.props.children === fragment).length;
}

function countButton(root: ReactTestInstance, label: string): number {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  }).length;
}

async function renderScreen(
  { focus = true }: { focus?: boolean } = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<TenantListScreen />);
  });
  mounted.push(renderer);
  if (focus) {
    emitFocus();
  }
  return renderer;
}

async function changeSearch(renderer: ReactTestRenderer, term: string): Promise<void> {
  const input = renderer.root.findByType(TextInput);
  await act(async () => {
    input.props.onChangeText(term);
  });
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

  afterEach(() => {
    for (const renderer of mounted.splice(0)) {
      act(() => {
        renderer.unmount();
      });
    }
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

  it('shows the no-results message for a search with no matches', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);

    await changeSearch(renderer, 'zzz');

    expect(textShown(renderer.root, 'No tenants match your search.')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);

    await changeSearch(renderer, '');

    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'No tenants match your search.')).toBe(false);
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

  it('reads the next page once when load more is pressed twice before the append commits', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));
    store.push(buildTenant('tenant-3', 'Carla Mwangi', 3));

    const renderer = await renderScreen();
    const execute = jest.mocked(listTenants.execute);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);

    // Database reads are synchronous, so a read can only be "in flight" between
    // the press and the React commit that shows its appended page. Invoking the
    // same handler twice inside one act reproduces two taps in that window.
    const loadMore = findButton(renderer.root, 'Load more');
    await act(async () => {
      loadMore.onPress();
      loadMore.onPress();
    });

    // The initial load plus exactly one pagination read.
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({ search: '', offset: 1 });
    expect(countText(renderer.root, 'Brian Otieno')).toBe(1);
    expect(countText(renderer.root, 'Carla Mwangi')).toBe(0);
  });

  it('appends the requested page exactly once after a successful read', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    const execute = jest.mocked(listTenants.execute);

    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({ search: '', offset: 1 });
    expect(countText(renderer.root, 'Amina Njeri')).toBe(1);
    expect(countText(renderer.root, 'Brian Otieno')).toBe(1);
    expect(countButton(renderer.root, 'Load more')).toBe(0);
  });

  it('allows retrying after a pagination read fails', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    const execute = jest.mocked(listTenants.execute);
    const working = execute.getMockImplementation()!;
    let failing = true;
    execute.mockImplementation((query: { search?: string; offset?: number; limit?: number } = {}) => {
      if ((query.offset ?? 0) > 0 && failing) {
        failing = false;
        throw new Error('page failed');
      }
      return working(query);
    });

    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);

    // The failure releases the guard, so the same next page can be requested.
    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenLastCalledWith({ search: '', offset: 1 });
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(countText(renderer.root, 'Brian Otieno')).toBe(1);
  });

  it('ignores a load more handler captured before a search replaced the list', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));
    store.push(buildTenant('tenant-3', 'Carla Mwangi', 3));
    store.push(buildTenant('tenant-4', 'Daniel Kimani', 4));

    const renderer = await renderScreen();
    // Show two rows, so the captured handler is offset by two rows and would
    // skip the second matching row of a list that has since been reset.
    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });
    const staleLoadMore = findButton(renderer.root, 'Load more');

    await changeSearch(renderer, 'a');
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);

    const execute = jest.mocked(listTenants.execute);
    const callsAfterSearch = execute.mock.calls.length;

    await act(async () => {
      staleLoadMore.onPress();
    });

    expect(execute).toHaveBeenCalledTimes(callsAfterSearch);
    expect(textShown(renderer.root, 'Carla Mwangi')).toBe(false);
    expect(countText(renderer.root, 'Amina Njeri')).toBe(1);
  });

  it('ignores a load more handler captured before a focus reload replaced the list', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));

    const renderer = await renderScreen();
    const staleLoadMore = findButton(renderer.root, 'Load more');

    store.push(buildTenant('tenant-3', 'Carla Mwangi', 3));
    emitFocus();

    const execute = jest.mocked(listTenants.execute);
    const callsAfterReload = execute.mock.calls.length;

    await act(async () => {
      staleLoadMore.onPress();
    });

    expect(execute).toHaveBeenCalledTimes(callsAfterReload);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);
    expect(textShown(renderer.root, 'Carla Mwangi')).toBe(false);

    // The handler from the reloaded render still pages that list.
    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(execute).toHaveBeenCalledTimes(callsAfterReload + 1);
  });

  it('pages through successive results while more rows remain', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    store.push(buildTenant('tenant-2', 'Brian Otieno', 2));
    store.push(buildTenant('tenant-3', 'Carla Mwangi', 3));

    const renderer = await renderScreen();
    const execute = jest.mocked(listTenants.execute);

    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(textShown(renderer.root, 'Carla Mwangi')).toBe(false);

    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
    });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenNthCalledWith(2, { search: '', offset: 1 });
    expect(execute).toHaveBeenNthCalledWith(3, { search: '', offset: 2 });
    expect(countText(renderer.root, 'Amina Njeri')).toBe(1);
    expect(countText(renderer.root, 'Brian Otieno')).toBe(1);
    expect(countText(renderer.root, 'Carla Mwangi')).toBe(1);
    expect(countButton(renderer.root, 'Load more')).toBe(0);
  });

  it('does not read during render and loads once when the screen gains focus', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));

    const renderer = await renderScreen({ focus: false });

    expect(listTenants.execute).not.toHaveBeenCalled();
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(false);

    emitFocus();

    expect(listTenants.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
  });

  it('shows the generic error without an empty state when the initial read fails', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    jest.mocked(listTenants.execute).mockImplementation(() => {
      throw new Error('read failed');
    });

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(false);
  });

  it('recovers after an initial read failure when the screen regains focus', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    const execute = jest.mocked(listTenants.execute);
    const working = execute.getMockImplementation()!;
    let failed = false;
    execute.mockImplementation((query: { search?: string; offset?: number; limit?: number } = {}) => {
      if (!failed) {
        failed = true;
        throw new Error('read failed');
      }
      return working(query);
    });

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);

    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);
  });

  it('keeps the existing rows when a later focus reload fails', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);

    jest.mocked(listTenants.execute).mockImplementation(() => {
      throw new Error('reload failed');
    });
    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);
  });

  it('keeps the existing rows when a search query fails', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));
    const renderer = await renderScreen();
    const execute = jest.mocked(listTenants.execute);
    const working = execute.getMockImplementation()!;
    execute.mockImplementation((query: { search?: string; offset?: number; limit?: number } = {}) => {
      if (query.search === 'boom') {
        throw new Error('query failed');
      }
      return working(query);
    });

    await changeSearch(renderer, 'boom');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'No tenants yet.')).toBe(false);
    expect(textShown(renderer.root, 'No tenants match your search.')).toBe(false);
    expect(execute).toHaveBeenLastCalledWith({ search: 'boom' });
  });

  it('navigates to a tenant, the create form, and the archived list', async () => {
    store.push(buildTenant('tenant-1', 'Amina Njeri'));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Amina Njeri').onPress();
      findButton(renderer.root, 'Add tenant').onPress();
      findButton(renderer.root, 'Archived tenants').onPress();
    });

    expect(router.push).toHaveBeenNthCalledWith(1, '/tenants/tenant-1');
    expect(router.push).toHaveBeenNthCalledWith(2, '/tenants/new');
    expect(router.push).toHaveBeenNthCalledWith(3, '/tenants/archived');
  });
});
