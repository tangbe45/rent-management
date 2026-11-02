import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { Tenant } from '../domain/tenant';
import { TenantList } from './tenant-list';

jest.setTimeout(30_000);

afterEach(() => {
  setLocale('en');
});

function buildTenant(
  id: string,
  fullName: string,
  overrides: { phone?: string; email?: string } = {},
): Tenant {
  return Tenant.create({
    id,
    fullName,
    phone: overrides.phone,
    email: overrides.email,
    createdAt: 1,
  });
}

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[buttons.length - 1]!.props as { onPress: () => void };
}

function countButton(root: ReactTestInstance, label: string): number {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  }).length;
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === message);
}

async function renderList(
  overrides: {
    tenants?: readonly Tenant[];
    total?: number;
    onOpen?: jest.Mock;
    onCreate?: jest.Mock;
    onOpenArchived?: jest.Mock;
    onSearchChange?: jest.Mock;
    onLoadMore?: jest.Mock;
  } = {},
) {
  const handlers = {
    onOpen: jest.fn(),
    onCreate: jest.fn(),
    onOpenArchived: jest.fn(),
    onSearchChange: jest.fn(),
    onLoadMore: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <TenantList
        tenants={overrides.tenants ?? []}
        total={overrides.total ?? (overrides.tenants?.length ?? 0)}
        search=""
        {...handlers}
      />,
    );
  });
  return { root: renderer.root, handlers };
}

describe('TenantList', () => {
  it('renders each tenant and opens it by id', async () => {
    const { root, handlers } = await renderList({
      tenants: [
        buildTenant('tenant-1', 'Amina Njeri', { phone: '0700 111', email: 'amina@example.com' }),
      ],
    });

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, '0700 111')).toBe(true);
    expect(textShown(root, 'amina@example.com')).toBe(true);

    await act(async () => {
      findButton(root, 'Amina Njeri').onPress();
    });

    expect(handlers.onOpen).toHaveBeenCalledWith('tenant-1');
  });

  it('shows an empty message when there are no tenants', async () => {
    const { root } = await renderList();

    expect(textShown(root, 'No tenants yet.')).toBe(true);
  });

  it('reports search input changes', async () => {
    const { root, handlers } = await renderList();
    const input = root.findByType(TextInput);

    await act(async () => {
      input.props.onChangeText('amina');
    });

    expect(handlers.onSearchChange).toHaveBeenCalledWith('amina');
  });

  it('exposes actions to create a tenant and view archived tenants', async () => {
    const { root, handlers } = await renderList();

    await act(async () => {
      findButton(root, 'Add tenant').onPress();
      findButton(root, 'Archived tenants').onPress();
    });

    expect(handlers.onCreate).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenArchived).toHaveBeenCalledTimes(1);
  });

  it('offers load more only while more tenants remain', async () => {
    const partial = await renderList({
      tenants: [buildTenant('tenant-1', 'Amina')],
      total: 2,
    });
    expect(countButton(partial.root, 'Load more')).toBeGreaterThanOrEqual(1);

    await act(async () => {
      findButton(partial.root, 'Load more').onPress();
    });
    expect(partial.handlers.onLoadMore).toHaveBeenCalledTimes(1);

    const complete = await renderList({ tenants: [buildTenant('tenant-1', 'Amina')], total: 1 });
    expect(countButton(complete.root, 'Load more')).toBe(0);
  });

  it('renders translated labels with the concept emoji when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderList();

    expect(textShown(root, '🧑 Locataires')).toBe(true);
    expect(textShown(root, 'Aucun locataire pour le moment.')).toBe(true);
    expect(textShown(root, 'Ajouter un locataire')).toBe(true);
    expect(textShown(root, 'Locataires archivés')).toBe(true);
  });
});
