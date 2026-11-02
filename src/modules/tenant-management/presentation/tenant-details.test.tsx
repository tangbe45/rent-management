import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { Tenant } from '../domain/tenant';
import { TenantDetails } from './tenant-details';

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

async function renderDetails(
  tenant: Tenant,
  overrides: { error?: string } = {},
) {
  const onEdit = jest.fn();
  const onCreateAgreement = jest.fn();
  const onOpenRent = jest.fn();
  const onArchive = jest.fn();
  const onRestore = jest.fn();
  const onBack = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <TenantDetails
        tenant={tenant}
        error={overrides.error}
        onEdit={onEdit}
        onCreateAgreement={onCreateAgreement}
        onOpenRent={onOpenRent}
        onArchive={onArchive}
        onRestore={onRestore}
        onBack={onBack}
      />,
    );
  });
  return {
    root: renderer.root,
    onEdit,
    onCreateAgreement,
    onOpenRent,
    onArchive,
    onRestore,
    onBack,
  };
}

describe('TenantDetails', () => {
  it('renders the tenant information', async () => {
    const tenant = Tenant.create({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: '0700 111',
      secondPhoneNumber: '0222 333',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
      createdAt: 1,
    });
    const { root } = await renderDetails(tenant);

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, '0700 111')).toBe(true);
    expect(textShown(root, '0222 333')).toBe(true);
    expect(textShown(root, 'amina@example.com')).toBe(true);
    expect(textShown(root, '0012345')).toBe(true);
    expect(textShown(root, 'Pays on time')).toBe(true);
  });

  it('offers archive for an active tenant and wires edit and back', async () => {
    const { root, onEdit, onCreateAgreement, onArchive, onBack } = await renderDetails(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
    );

    expect(countButton(root, 'Archive')).toBeGreaterThanOrEqual(1);
    expect(countButton(root, 'Restore')).toBe(0);
    expect(countButton(root, 'New rental agreement')).toBeGreaterThanOrEqual(1);

    await act(async () => {
      findButton(root, 'Edit').onPress();
      findButton(root, 'New rental agreement').onPress();
      findButton(root, 'Archive').onPress();
      findButton(root, 'Back').onPress();
    });

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCreateAgreement).toHaveBeenCalledTimes(1);
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the New rental agreement action for an archived tenant', async () => {
    const archived = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(
      2,
    );
    const { root } = await renderDetails(archived);

    expect(textShown(root, 'Archived')).toBe(true);
    expect(countButton(root, 'New rental agreement')).toBe(0);
    expect(countButton(root, 'Restore')).toBeGreaterThanOrEqual(1);
    expect(countButton(root, 'Archive')).toBe(0);
  });

  it('keeps historical agreement access for an archived tenant', async () => {
    const archived = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(
      2,
    );
    const { root, onOpenRent } = await renderDetails(archived);

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(countButton(root, 'Rent for tenant')).toBeGreaterThanOrEqual(1);

    await act(async () => {
      findButton(root, 'Rent for tenant').onPress();
    });
    expect(onOpenRent).toHaveBeenCalledTimes(1);
  });

  it('shows the archived badge and offers restore for an archived tenant', async () => {
    const archived = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }).archive(
      2,
    );
    const { root, onRestore } = await renderDetails(archived);

    expect(textShown(root, 'Archived')).toBe(true);
    expect(countButton(root, 'Restore')).toBeGreaterThanOrEqual(1);
    expect(countButton(root, 'Archive')).toBe(0);

    await act(async () => {
      findButton(root, 'Restore').onPress();
    });
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('renders an error message when provided', async () => {
    const { root } = await renderDetails(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
      { error: 'This tenant cannot be archived because they have active rental agreements.' },
    );

    expect(
      textShown(root, 'This tenant cannot be archived because they have active rental agreements.'),
    ).toBe(true);
  });

  it('renders translated labels when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderDetails(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
    );

    expect(textShown(root, 'Modifier')).toBe(true);
    expect(textShown(root, 'Archiver')).toBe(true);
  });
});
