import { router, useFocusEffect } from 'expo-router';
import { Alert, Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { normalizeSearchText } from '../../../shared/domain/search-text';
import {
  cancelLatestAlert,
  confirmLatestAlert,
  installAlertSpy,
  latestAlertMessage,
} from '../../property-management/presentation/alert-confirmation.test-support';
import {
  DEFAULT_TENANT_PAGE_SIZE,
  type TenantPage,
  type TenantQuery,
} from '../domain/tenant-repository';
import { Tenant } from '../domain/tenant';
import { listArchivedTenants, restoreTenant } from '../infrastructure/composition-root';
import { ArchivedTenantListScreen } from './archived-tenant-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listArchivedTenants: { execute: jest.fn(), count: jest.fn() },
  restoreTenant: { execute: jest.fn() },
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

function findButtonCount(root: ReactTestInstance, label: string): number {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  }).length;
}

function findFirstButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[0]!.props as { onPress: () => void };
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === message);
}

function textCount(root: ReactTestInstance, message: string): number {
  return root
    .findAllByType(Text)
    .filter((instance) => instance.props.children === message).length;
}

function renderedNames(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map((instance) => instance.props.children)
    .filter((child): child is string => typeof child === 'string' && child.startsWith('Archived '));
}

async function renderScreen(
  { focus = true }: { focus?: boolean } = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ArchivedTenantListScreen />);
  });
  mounted.push(renderer);
  if (focus) {
    emitFocus();
  }
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

async function changeSearch(renderer: ReactTestRenderer, term: string): Promise<void> {
  const input = renderer.root.findByType(TextInput);
  await act(async () => {
    input.props.onChangeText(term);
  });
}

async function pressLoadMore(renderer: ReactTestRenderer): Promise<void> {
  await act(async () => {
    findButton(renderer.root, 'Load more').onPress();
  });
}

describe('ArchivedTenantListScreen', () => {
  let store: Tenant[];

  function page(query: TenantQuery = {}): TenantPage {
    const search = normalizeSearchText(query.search ?? '');
    const offset = query.offset ?? 0;
    const limit = query.limit ?? DEFAULT_TENANT_PAGE_SIZE;
    const matching = [...store]
      .filter(
        (tenant) =>
          search.length === 0 || normalizeSearchText(tenant.fullName).includes(search),
      )
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
          return left.createdAt - right.createdAt;
        }
        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      });
    return { tenants: matching.slice(offset, offset + limit), total: matching.length };
  }

  function archive(id: string, fullName: string, createdAt: number): void {
    store.push(Tenant.create({ id, fullName, createdAt }).archive(createdAt + 1));
  }

  function seedArchived(count: number, prefix = 'Archived'): void {
    for (let index = 0; index < count; index += 1) {
      archive(`tenant-${index.toString().padStart(2, '0')}`, `${prefix} ${index}`, index);
    }
  }

  /** Fails the first list read only, so a later search can succeed. */
  function failFirstPageRead(): void {
    const execute = jest.mocked(listArchivedTenants.execute);
    const working = execute.getMockImplementation()!;
    let failed = false;
    execute.mockImplementation((query: TenantQuery = {}) => {
      if (!failed) {
        failed = true;
        throw new Error('list failed');
      }
      return working(query);
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    installAlertSpy();
    store = [];
    jest.mocked(listArchivedTenants.execute).mockImplementation((query: TenantQuery = {}) =>
      page(query),
    );
    jest.mocked(listArchivedTenants.count).mockImplementation(() => store.length);
    jest.mocked(restoreTenant.execute).mockImplementation((input: { id: string }) => {
      const found = store.find((tenant) => tenant.id === input.id)!;
      store = store.filter((tenant) => tenant.id !== input.id);
      return found.restore(3);
    });
  });

  afterEach(() => {
    for (const renderer of mounted.splice(0)) {
      act(() => {
        renderer.unmount();
      });
    }
    jest.restoreAllMocks();
  });

  it('lists archived tenants and opens one by id', async () => {
    archive('tenant-1', 'Amina Njeri', 1);

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, '1 matching archived tenant')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'View details').onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/tenants/tenant-1');
  });

  it('asks for confirmation before restoring and reloads after confirmation', async () => {
    archive('tenant-1', 'Amina Njeri', 1);

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    expect(restoreTenant.execute).not.toHaveBeenCalled();
    expect(jest.mocked(Alert.alert).mock.calls.at(-1)?.[0]).toBe('Restore tenant');
    expect(latestAlertMessage()).toContain('active tenant list');

    act(() => confirmLatestAlert());

    expect(restoreTenant.execute).toHaveBeenCalledTimes(1);
    expect(restoreTenant.execute).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(listArchivedTenants.execute).toHaveBeenCalledTimes(2);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(true);
  });

  it('does nothing when the restore confirmation is cancelled', async () => {
    archive('tenant-1', 'Amina Njeri', 1);

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    act(() => cancelLatestAlert());

    expect(restoreTenant.execute).not.toHaveBeenCalled();
    expect(listArchivedTenants.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(findButtonCount(renderer.root, 'Restore')).toBe(1);
  });

  it('shows the generic error and keeps the list when restoring fails', async () => {
    archive('tenant-1', 'Amina Njeri', 1);
    jest.mocked(restoreTenant.execute).mockImplementation(() => {
      throw new Error('restore failed');
    });

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore').onPress();
    });

    expect(() => act(() => confirmLatestAlert())).not.toThrow();

    expect(restoreTenant.execute).toHaveBeenCalledTimes(1);
    expect(listArchivedTenants.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
  });

  it('loads at most the first twenty archived tenants and then the next page', async () => {
    seedArchived(25);

    const renderer = await renderScreen();
    expect(renderedNames(renderer.root)).toHaveLength(20);
    expect(textShown(renderer.root, '25 matching archived tenants')).toBe(true);
    expect(textShown(renderer.root, 'Archived 20')).toBe(false);

    await pressLoadMore(renderer);

    expect(renderedNames(renderer.root)).toHaveLength(25);
    expect(textShown(renderer.root, 'Archived 20')).toBe(true);
    expect(textShown(renderer.root, 'Archived 24')).toBe(true);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
    expect(listArchivedTenants.execute).toHaveBeenLastCalledWith({
      search: '',
      limit: DEFAULT_TENANT_PAGE_SIZE,
      offset: 20,
    });
  });

  it('shows no Load more action when the first page holds every match', async () => {
    seedArchived(5);

    const renderer = await renderScreen();

    expect(renderedNames(renderer.root)).toHaveLength(5);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
  });

  it('resets to the first page when the search term changes and never mixes results', async () => {
    seedArchived(25);
    archive('tenant-99', 'Brian Otieno', 99);

    const renderer = await renderScreen();
    await pressLoadMore(renderer);
    expect(renderedNames(renderer.root)).toHaveLength(25);

    await changeSearch(renderer, 'brian');

    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(textShown(renderer.root, 'Archived 0')).toBe(false);
    expect(renderedNames(renderer.root)).toEqual([]);
    expect(textShown(renderer.root, '1 matching archived tenant')).toBe(true);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
    expect(listArchivedTenants.execute).toHaveBeenLastCalledWith({ search: 'brian' });

    await changeSearch(renderer, '');
    expect(renderedNames(renderer.root)).toHaveLength(20);
  });

  it('searches archived tenants case- and accent-insensitively', async () => {
    archive('tenant-1', 'Élodie Durand', 1);
    archive('tenant-2', 'Brian Otieno', 2);

    const renderer = await renderScreen();
    await changeSearch(renderer, 'ELODIE');

    expect(textShown(renderer.root, 'Élodie Durand')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);
    expect(textShown(renderer.root, '1 matching archived tenant')).toBe(true);
  });

  it('distinguishes no archived tenants from a search without matches', async () => {
    const empty = await renderScreen();
    expect(textShown(empty.root, 'No archived tenants.')).toBe(true);

    archive('tenant-1', 'Amina Njeri', 1);
    const renderer = await renderScreen();
    await changeSearch(renderer, 'zzz');

    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
  });

  it('does not read during render and loads once when the screen gains focus', async () => {
    seedArchived(1);

    const renderer = await renderScreen({ focus: false });

    expect(listArchivedTenants.execute).not.toHaveBeenCalled();
    expect(listArchivedTenants.count).not.toHaveBeenCalled();
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);

    emitFocus();

    expect(listArchivedTenants.execute).toHaveBeenCalledTimes(1);
    expect(listArchivedTenants.count).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
  });

  it('shows the generic error without an empty state when the initial list read fails', async () => {
    seedArchived(1);
    jest.mocked(listArchivedTenants.execute).mockImplementation(() => {
      throw new Error('list failed');
    });

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(false);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
    expect(listArchivedTenants.count).not.toHaveBeenCalled();
  });

  it('shows the generic error without an empty state when the initial count read fails', async () => {
    seedArchived(1);
    jest.mocked(listArchivedTenants.count).mockImplementation(() => {
      throw new Error('count failed');
    });

    const renderer = await renderScreen();

    expect(listArchivedTenants.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
    expect(textShown(renderer.root, 'Archived 0')).toBe(false);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
  });

  it('recovers after an initial read failure when the screen regains focus', async () => {
    seedArchived(1);
    const execute = jest.mocked(listArchivedTenants.execute);
    const working = execute.getMockImplementation()!;
    let failed = false;
    execute.mockImplementation((query: TenantQuery = {}) => {
      if (!failed) {
        failed = true;
        throw new Error('list failed');
      }
      return working(query);
    });

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);

    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
  });

  it('shows the no-match message when a search succeeds after the initial read failed', async () => {
    archive('tenant-1', 'Amina Njeri', 1);
    failFirstPageRead();

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(false);

    await changeSearch(renderer, 'zzz');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
    expect(findButtonCount(renderer.root, 'Load more')).toBe(0);
    expect(listArchivedTenants.execute).toHaveBeenLastCalledWith({ search: 'zzz' });
    // The unfiltered total is the only way to tell an empty archive from a
    // search without matches, so it is refreshed on the successful path.
    expect(listArchivedTenants.count).toHaveBeenCalledTimes(1);
    expect(listArchivedTenants.count).toHaveLastReturnedWith(1);
  });

  it('shows matching rows and the result count when a search succeeds after the initial read failed', async () => {
    archive('tenant-1', 'Amina Njeri', 1);
    archive('tenant-2', 'Brian Otieno', 2);
    failFirstPageRead();

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);

    await changeSearch(renderer, 'amina');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(false);
    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(false);
    expect(textShown(renderer.root, '1 matching archived tenant')).toBe(true);
    expect(listArchivedTenants.execute).toHaveBeenLastCalledWith({ search: 'amina' });
  });

  it('keeps the empty-archive message when a search of an empty archive succeeds after a failed read', async () => {
    failFirstPageRead();

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);

    await changeSearch(renderer, 'zzz');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants match your search.')).toBe(false);
  });

  it('does not load the same page twice on repeated Load more presses', async () => {
    seedArchived(45);

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Load more').onPress();
      findButton(renderer.root, 'Load more').onPress();
    });

    expect(renderedNames(renderer.root)).toHaveLength(45);
    expect(textCount(renderer.root, 'Archived 19')).toBe(1);
    expect(textCount(renderer.root, 'Archived 44')).toBe(1);
    expect(
      jest
        .mocked(listArchivedTenants.execute)
        .mock.calls.map((call) => call[0])
        .filter((query) => query?.offset !== undefined)
        .map((query) => query?.offset),
    ).toEqual([20, 40]);
  });

  it('shows the existing error without replacing results when a query fails', async () => {
    seedArchived(2);
    const execute = jest.mocked(listArchivedTenants.execute);
    const working = execute.getMockImplementation()!;

    const renderer = await renderScreen();
    execute.mockImplementation((query: TenantQuery = {}) => {
      if (query.search === 'boom') {
        throw new Error('query failed');
      }
      return working(query);
    });

    await changeSearch(renderer, 'boom');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
    expect(textShown(renderer.root, 'Archived 1')).toBe(true);
    expect(execute).toHaveBeenLastCalledWith({ search: 'boom' });
  });

  it('keeps the existing rows when a later focus reload fails', async () => {
    seedArchived(2);

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
    expect(textShown(renderer.root, 'Archived 1')).toBe(true);

    jest.mocked(listArchivedTenants.execute).mockImplementation(() => {
      throw new Error('reload failed');
    });
    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
    expect(textShown(renderer.root, 'Archived 1')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
  });

  it('keeps the existing rows when a later count read fails', async () => {
    seedArchived(2);

    const renderer = await renderScreen();
    jest.mocked(listArchivedTenants.count).mockImplementation(() => {
      throw new Error('count failed');
    });
    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Archived 0')).toBe(true);
    expect(textShown(renderer.root, 'Archived 1')).toBe(true);
    expect(textShown(renderer.root, 'No archived tenants.')).toBe(false);
  });

  it('updates the count and keeps the remaining rows after a successful restore', async () => {
    archive('tenant-1', 'Amina Njeri', 1);
    archive('tenant-2', 'Brian Otieno', 2);
    archive('tenant-3', 'Carla Mwangi', 3);

    const renderer = await renderScreen();
    expect(textShown(renderer.root, '3 matching archived tenants')).toBe(true);

    await act(async () => {
      findFirstButton(renderer.root, 'Restore').onPress();
    });
    act(() => confirmLatestAlert());

    expect(textShown(renderer.root, 'Amina Njeri')).toBe(false);
    expect(textShown(renderer.root, '2 matching archived tenants')).toBe(true);
    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(textShown(renderer.root, 'Carla Mwangi')).toBe(true);
    expect(jest.mocked(listArchivedTenants.count)).toHaveBeenLastCalledWith();
  });

  it('refreshes the archived list when the screen regains focus', async () => {
    archive('tenant-1', 'Amina Njeri', 1);

    const renderer = await renderScreen();
    store.push(Tenant.create({ id: 'tenant-2', fullName: 'Brian Otieno', createdAt: 2 }).archive(3));
    emitFocus();

    expect(textShown(renderer.root, 'Brian Otieno')).toBe(true);
    expect(textShown(renderer.root, '2 matching archived tenants')).toBe(true);
  });

  it('restoring the last row of a loaded page does not skip the next record', async () => {
    seedArchived(25);

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Archived 19')).toBe(true);
    expect(textShown(renderer.root, 'Archived 20')).toBe(false);

    // Restore the last row of the currently displayed page. The reload refetches
    // the same window size, so the next record moves up instead of being skipped.
    await act(async () => {
      const restoreButtons = renderer.root.findAll((instance) => {
        const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
        return props.accessibilityLabel === 'Restore' && typeof props.onPress === 'function';
      });
      restoreButtons[restoreButtons.length - 1]!.props.onPress();
    });
    act(() => confirmLatestAlert());

    expect(textShown(renderer.root, 'Archived 19')).toBe(false);
    expect(textShown(renderer.root, 'Archived 20')).toBe(true);
    expect(textShown(renderer.root, '24 matching archived tenants')).toBe(true);

    await pressLoadMore(renderer);

    expect(renderedNames(renderer.root)).toHaveLength(24);
    expect(new Set(renderedNames(renderer.root)).size).toBe(24);
    expect(textShown(renderer.root, 'Archived 24')).toBe(true);
  });

  it('keeps deterministic order when archived timestamps are tied', async () => {
    archive('tenant-c', 'Archived C', 1);
    archive('tenant-a', 'Archived A', 1);
    archive('tenant-b', 'Archived B', 1);

    const renderer = await renderScreen();

    expect(renderedNames(renderer.root)).toEqual(['Archived A', 'Archived B', 'Archived C']);
  });
});
