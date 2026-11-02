import { router, useFocusEffect } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Tenant } from '../domain/tenant';
import { createTenant, getTenant, updateTenant } from '../infrastructure/composition-root';
import { TenantFormScreen } from './tenant-form-screen';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  createTenant: { execute: jest.fn() },
  getTenant: { execute: jest.fn() },
  updateTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function findInput(root: ReactTestInstance, label: string): ReactTestInstance {
  const input = root
    .findAllByType(TextInput)
    .find((instance) => instance.props.accessibilityLabel === label);
  expect(input).toBeDefined();
  return input!;
}

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

async function renderScreen(
  mode: 'create' | 'edit',
  tenantId?: string,
  { focus = true }: { focus?: boolean } = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<TenantFormScreen mode={mode} tenantId={tenantId} />);
  });
  if (focus) {
    emitFocus();
  }
  return renderer;
}

/** Runs the callback the screen registered with `useFocusEffect`, like a focus event. */
function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const callback = calls[calls.length - 1]![0];
  act(() => {
    callback();
  });
}

function formInputs(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAllByType(TextInput);
}

describe('TenantFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a tenant and navigates to its details', async () => {
    const created = Tenant.create({ id: 'tenant-9', fullName: 'Amina Njeri', createdAt: 1 });
    jest.mocked(createTenant.execute).mockReturnValue(created);

    const renderer = await renderScreen('create');
    await act(async () => {
      findInput(renderer.root, 'Full name').props.onChangeText('Amina Njeri');
    });
    await act(async () => {
      findButton(renderer.root, 'Save tenant').onPress();
    });

    expect(createTenant.execute).toHaveBeenCalledWith({
      fullName: 'Amina Njeri',
      phone: '',
      secondPhoneNumber: '',
      email: '',
      nationalIdCardNumber: '',
      notes: '',
    });
    expect(router.replace).toHaveBeenCalledWith('/tenants/tenant-9');
  });

  it('updates an existing tenant and returns to the previous screen', async () => {
    const existing = Tenant.create({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: '0700 111',
      createdAt: 1,
    });
    jest.mocked(getTenant.execute).mockReturnValue(existing);

    const renderer = await renderScreen('edit', 'tenant-1');
    expect(findInput(renderer.root, 'Full name').props.value).toBe('Amina Njeri');

    await act(async () => {
      findInput(renderer.root, 'Full name').props.onChangeText('Amina N. Njeri');
    });
    await act(async () => {
      findButton(renderer.root, 'Save changes').onPress();
    });

    expect(updateTenant.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tenant-1', fullName: 'Amina N. Njeri' }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows a not-found state when editing a missing tenant', async () => {
    jest.mocked(getTenant.execute).mockReturnValue(null);

    const renderer = await renderScreen('edit', 'missing');

    expect(textShown(renderer.root, 'Tenant not found.')).toBe(true);
  });

  it('never reads an existing tenant in create mode', async () => {
    const renderer = await renderScreen('create');

    expect(getTenant.execute).not.toHaveBeenCalled();
    expect(formInputs(renderer.root).length).toBeGreaterThan(0);
  });

  it('does not read during render and loads the tenant once the form gains focus', async () => {
    const existing = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });
    jest.mocked(getTenant.execute).mockReturnValue(existing);

    const renderer = await renderScreen('edit', 'tenant-1', { focus: false });

    expect(getTenant.execute).not.toHaveBeenCalled();
    expect(formInputs(renderer.root)).toHaveLength(0);
    expect(textShown(renderer.root, 'Tenant not found.')).toBe(false);

    emitFocus();

    expect(getTenant.execute).toHaveBeenCalledTimes(1);
    expect(getTenant.execute).toHaveBeenCalledWith({ id: 'tenant-1' });
    expect(findInput(renderer.root, 'Full name').props.value).toBe('Amina Njeri');
  });

  it('handles a failed edit read instead of rendering an empty form', async () => {
    jest.mocked(getTenant.execute).mockImplementation(() => {
      throw new Error('read failed');
    });

    const renderer = await renderScreen('edit', 'tenant-1');

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Tenant not found.')).toBe(false);
    expect(formInputs(renderer.root)).toHaveLength(0);
    expect(findButton(renderer.root, 'Back')).toBeDefined();
  });

  it('recovers from a failed edit read when the form regains focus', async () => {
    const existing = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });
    jest.mocked(getTenant.execute).mockReturnValue(existing);
    const execute = jest.mocked(getTenant.execute);
    const working = execute.getMockImplementation()!;
    let failed = false;
    execute.mockImplementation((input: { id: string }) => {
      if (!failed) {
        failed = true;
        throw new Error('read failed');
      }
      return working(input);
    });

    const renderer = await renderScreen('edit', 'tenant-1');
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(formInputs(renderer.root)).toHaveLength(0);

    emitFocus();

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(false);
    expect(findInput(renderer.root, 'Full name').props.value).toBe(existing.fullName);
  });

  it('keeps the loaded form when a focus reload fails', async () => {
    const existing = Tenant.create({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: '0700 111',
      createdAt: 1,
    });
    jest.mocked(getTenant.execute).mockReturnValue(existing);

    const renderer = await renderScreen('edit', 'tenant-1');
    const inputsBefore = formInputs(renderer.root).length;
    expect(inputsBefore).toBeGreaterThan(0);
    expect(findInput(renderer.root, 'Full name').props.value).toBe('Amina Njeri');
    expect(findInput(renderer.root, 'Phone number').props.value).toBe('0700 111');

    jest.mocked(getTenant.execute).mockImplementation(() => {
      throw new Error('reload failed');
    });
    emitFocus();

    // The already mounted form stays on screen with the values it was
    // initialized from: a failed reload never re-initializes it with empties.
    expect(getTenant.execute).toHaveBeenCalledTimes(2);
    expect(formInputs(renderer.root)).toHaveLength(inputsBefore);
    expect(findInput(renderer.root, 'Full name').props.value).toBe('Amina Njeri');
    expect(findInput(renderer.root, 'Phone number').props.value).toBe('0700 111');
    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(textShown(renderer.root, 'Tenant not found.')).toBe(false);
  });

  it('keeps unsaved edits when a focus reload returns refreshed values', async () => {
    const existing = Tenant.create({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: '0700 111',
      createdAt: 1,
    });
    jest.mocked(getTenant.execute).mockReturnValue(existing);

    const renderer = await renderScreen('edit', 'tenant-1');
    await act(async () => {
      findInput(renderer.root, 'Full name').props.onChangeText('Amina Unsaved');
    });

    // The stored record changes while the form is open (for example after an
    // edit elsewhere), so the reload returns different persisted values under
    // the same id.
    jest.mocked(getTenant.execute).mockReturnValue(
      Tenant.create({
        id: 'tenant-1',
        fullName: 'Amina Updated',
        phone: '0700 222',
        createdAt: 1,
      }),
    );
    emitFocus();

    // Same tenant id keeps the form mounted, so its own state wins over the
    // refreshed record: the unsaved name and the untouched phone both survive.
    expect(getTenant.execute).toHaveBeenCalledTimes(2);
    expect(formInputs(renderer.root).length).toBeGreaterThan(0);
    expect(findInput(renderer.root, 'Full name').props.value).toBe('Amina Unsaved');
    expect(findInput(renderer.root, 'Phone number').props.value).toBe('0700 111');
    expect(createTenant.execute).not.toHaveBeenCalled();
    expect(updateTenant.execute).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('surfaces a generic error when persistence fails', async () => {
    jest.mocked(createTenant.execute).mockImplementation(() => {
      throw new Error('database failed');
    });

    const renderer = await renderScreen('create');
    await act(async () => {
      findInput(renderer.root, 'Full name').props.onChangeText('Amina Njeri');
    });
    await act(async () => {
      findButton(renderer.root, 'Save tenant').onPress();
    });

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
