import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { Tenant } from '../domain/tenant';
import { ArchivedTenantList } from './archived-tenant-list';

jest.setTimeout(30_000);

const mounted: ReactTestRenderer[] = [];

afterEach(() => {
  for (const renderer of mounted.splice(0)) {
    act(() => {
      renderer.unmount();
    });
  }
  setLocale('en');
});

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

interface ListProps {
  tenants?: readonly Tenant[];
  total?: number;
  archivedTotal?: number;
  loaded?: boolean;
  search?: string;
  error?: string;
}

async function renderList(props: ListProps = {}) {
  const tenants = props.tenants ?? [];
  const onOpen = jest.fn();
  const onRestore = jest.fn();
  const onBack = jest.fn();
  const onSearchChange = jest.fn();
  const onLoadMore = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ArchivedTenantList
        tenants={tenants}
        total={props.total ?? tenants.length}
        archivedTotal={props.archivedTotal ?? tenants.length}
        loaded={props.loaded ?? true}
        search={props.search ?? ''}
        onSearchChange={onSearchChange}
        onLoadMore={onLoadMore}
        error={props.error}
        onOpen={onOpen}
        onRestore={onRestore}
        onBack={onBack}
      />,
    );
  });
  mounted.push(renderer);
  return { root: renderer.root, onOpen, onRestore, onBack, onSearchChange, onLoadMore };
}

function archivedTenant(id: string, fullName: string, createdAt = 1) {
  return Tenant.create({ id, fullName, createdAt }).archive(createdAt + 1);
}

describe('ArchivedTenantList', () => {
  it('shows an empty message when there are no archived tenants', async () => {
    const { root } = await renderList();

    expect(textShown(root, 'No archived tenants.')).toBe(true);
    expect(textShown(root, 'No archived tenants match your search.')).toBe(false);
  });

  it('shows no empty message before the first load completes', async () => {
    const { root } = await renderList({ loaded: false });

    expect(textShown(root, 'No archived tenants.')).toBe(false);
    expect(textShown(root, 'No archived tenants match your search.')).toBe(false);
    expect(textShown(root, '0 matching archived tenants')).toBe(false);
  });

  it('shows the error instead of an empty message when the first load fails', async () => {
    const { root } = await renderList({
      loaded: false,
      error: 'Something went wrong. Please try again.',
    });

    expect(textShown(root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(root, 'No archived tenants.')).toBe(false);
    expect(textShown(root, 'No archived tenants match your search.')).toBe(false);
  });

  it('shows the error instead of an empty message when a later load fails', async () => {
    const { root } = await renderList({
      archivedTotal: 0,
      loaded: true,
      error: 'Something went wrong. Please try again.',
    });

    expect(textShown(root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(root, 'No archived tenants.')).toBe(false);
  });

  it('shows a distinct no-results message when a search matches nothing', async () => {
    const { root } = await renderList({ archivedTotal: 4, search: 'zzz' });

    expect(textShown(root, 'No archived tenants match your search.')).toBe(true);
    expect(textShown(root, 'No archived tenants.')).toBe(false);
  });

  it('shows the matching total and a Load more action when more rows exist', async () => {
    const { root, onLoadMore } = await renderList({
      tenants: [archivedTenant('tenant-1', 'Amina Njeri'), archivedTenant('tenant-2', 'Brian Otieno', 2)],
      total: 5,
      archivedTotal: 5,
    });

    expect(textShown(root, '5 matching archived tenants')).toBe(true);

    await act(async () => {
      findButton(root, 'Load more').onPress();
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides Load more when every matching row is displayed', async () => {
    const { root } = await renderList({
      tenants: [archivedTenant('tenant-1', 'Amina Njeri')],
      total: 1,
      archivedTotal: 1,
    });

    const loadMore = root.findAll((instance) => {
      const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
      return props.accessibilityLabel === 'Load more' && typeof props.onPress === 'function';
    });
    expect(loadMore).toHaveLength(0);
  });

  it('reports search input changes', async () => {
    const { root, onSearchChange } = await renderList({ search: 'ami' });

    const input = root.findByType(TextInput);
    expect(input.props.value).toBe('ami');
    input.props.onChangeText('brian');
    expect(onSearchChange).toHaveBeenCalledWith('brian');
  });

  it('shows a load error without hiding the current rows', async () => {
    const { root } = await renderList({
      tenants: [archivedTenant('tenant-1', 'Amina Njeri')],
      error: 'Something went wrong. Please try again.',
    });

    expect(textShown(root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(root, 'Amina Njeri')).toBe(true);
  });

  it('opens and restores an archived tenant', async () => {
    const { root, onOpen, onRestore, onBack } = await renderList({
      tenants: [archivedTenant('tenant-1', 'Amina Njeri')],
    });

    expect(textShown(root, 'Amina Njeri')).toBe(true);

    await act(async () => {
      findButton(root, 'View details').onPress();
      findButton(root, 'Restore').onPress();
      findButton(root, 'Back').onPress();
    });

    expect(onOpen).toHaveBeenCalledWith('tenant-1');
    expect(onRestore).toHaveBeenCalledWith('tenant-1');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders translated labels when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderList();

    expect(textShown(root, '🧑 Locataires archivés')).toBe(true);
    expect(textShown(root, 'Aucun locataire archivé.')).toBe(true);
  });

  it('renders the French no-results and total labels', async () => {
    setLocale('fr');
    const { root } = await renderList({
      tenants: [archivedTenant('tenant-1', 'Amina Njeri')],
      total: 3,
      archivedTotal: 3,
    });

    expect(textShown(root, '3 locataires archivés correspondants')).toBe(true);

    setLocale('fr');
    const noResults = await renderList({ archivedTotal: 2, search: 'zzz' });
    expect(
      textShown(
        noResults.root,
        'Aucun locataire archivé ne correspond à votre recherche.',
      ),
    ).toBe(true);
  });
});
