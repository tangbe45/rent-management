import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { Tenant } from '../domain/tenant';
import { ArchivedTenantList } from './archived-tenant-list';

jest.setTimeout(30_000);

afterEach(() => {
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

async function renderList(tenants: readonly ReturnType<typeof activeTenant>[]) {
  const onOpen = jest.fn();
  const onRestore = jest.fn();
  const onBack = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ArchivedTenantList
        tenants={tenants}
        onOpen={onOpen}
        onRestore={onRestore}
        onBack={onBack}
      />,
    );
  });
  return { root: renderer.root, onOpen, onRestore, onBack };
}

function activeTenant(id: string, fullName: string, createdAt = 1) {
  return Tenant.create({ id, fullName, createdAt });
}

describe('ArchivedTenantList', () => {
  it('shows an empty message when there are no archived tenants', async () => {
    const { root } = await renderList([]);

    expect(textShown(root, 'No archived tenants.')).toBe(true);
  });

  it('opens and restores an archived tenant', async () => {
    const { root, onOpen, onRestore, onBack } = await renderList([
      activeTenant('tenant-1', 'Amina Njeri').archive(2),
    ]);

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
    const { root } = await renderList([]);

    expect(textShown(root, '🧑 Locataires archivés')).toBe(true);
    expect(textShown(root, 'Aucun locataire archivé.')).toBe(true);
  });
});
