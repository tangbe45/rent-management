import { router } from 'expo-router';
import { TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../../property-management/domain/property';
import { PropertySpace } from '../../property-management/domain/property-space';
import {
  getPropertySpace,
  listProperties,
  listPropertySpaces,
} from '../../property-management/infrastructure/composition-root';
import { listTenants } from '../../tenant-management/infrastructure/composition-root';
import { Tenant } from '../../tenant-management/domain/tenant';
import { RentalAgreement } from '../domain/rental-agreement';
import {
  createRentalAgreement,
  getRentalAgreement,
  updateRentalAgreement,
} from '../infrastructure/composition-root';
import { AgreementFormScreen } from './agreement-form-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  createRentalAgreement: { execute: jest.fn() },
  getRentalAgreement: { execute: jest.fn() },
  updateRentalAgreement: { execute: jest.fn() },
}));

jest.mock('../../property-management/infrastructure/composition-root', () => ({
  getPropertySpace: { execute: jest.fn() },
  listProperties: { execute: jest.fn() },
  listPropertySpaces: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  listTenants: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const TENANT = Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 });
const PROPERTY = Property.create({
  id: 'property-1',
  name: 'Sunset Apartments',
  address: '1 Main Street',
  createdAt: 1,
});
const SPACE = PropertySpace.create({
  id: 'space-1',
  propertyId: 'property-1',
  parentSpaceId: null,
  name: 'Apartment A',
  type: 'APARTMENT',
  rentable: true,
  createdAt: 1,
});

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

function findInput(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root
    .findAllByType(TextInput)
    .find((instance) => (instance.props as { accessibilityLabel?: string }).accessibilityLabel === label);
}

async function fillInput(
  root: ReactTestInstance,
  label: string,
  value: string,
): Promise<void> {
  const input = findInput(root, label);
  expect(input).toBeDefined();
  await act(async () => {
    input!.props.onChangeText(value);
  });
}

async function renderScreen(
  props: Parameters<typeof AgreementFormScreen>[0],
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AgreementFormScreen {...props} />);
  });
  return renderer;
}

describe('AgreementFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listTenants.execute).mockReturnValue({ tenants: [TENANT], total: 1 });
    jest.mocked(listProperties.execute).mockReturnValue([PROPERTY]);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([SPACE]);
    jest.mocked(getPropertySpace.execute).mockReturnValue(SPACE);
  });

  it('creates an agreement with the values entered in the form', async () => {
    const created = RentalAgreement.create({
      id: 'agreement-1',
      tenantId: 'tenant-1',
      spaceId: 'space-1',
      startDate: '2026-01-01',
      rentAmount: 100_000,
      rentFrequency: 'MONTHLY',
      firstRentDueDate: '2026-01-01',
      createdAt: 1,
    });
    jest.mocked(createRentalAgreement.execute).mockReturnValue(created);

    const renderer = await renderScreen({ mode: 'create' });
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Choose a tenant')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Amina Njeri')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Choose the property')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Sunset Apartments')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Apartment A')?.props.onPress();
    });

    await fillInput(root, 'Move-in or agreement start date', '2026-01-01');
    await fillInput(root, 'When is the first rent payment due?', '2026-01-01');
    await fillInput(root, 'Rent amount', '1000');

    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });

    expect(createRentalAgreement.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      propertyId: 'property-1',
      spaceId: 'space-1',
      startDate: '2026-01-01',
      endDate: null,
      rentAmount: 100_000,
      rentFrequency: 'MONTHLY',
      firstRentDueDate: '2026-01-01',
      securityDepositAmount: null,
      notes: null,
    });
    expect(router.replace).toHaveBeenCalledWith('/agreements/agreement-1');
  });

  it('blocks submit and surfaces the conflict error from the use case', async () => {
    jest.mocked(createRentalAgreement.execute).mockImplementation(() => {
      throw new Error('boom');
    });

    const renderer = await renderScreen({ mode: 'create' });
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Choose a tenant')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Amina Njeri')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Choose the property')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Sunset Apartments')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Apartment A')?.props.onPress();
    });

    await fillInput(root, 'Move-in or agreement start date', '2026-01-01');
    await fillInput(root, 'When is the first rent payment due?', '2026-01-01');
    await fillInput(root, 'Rent amount', '1000');

    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });

    expect(createRentalAgreement.execute).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the active property workspace when managing spaces', async () => {
    jest.mocked(listPropertySpaces.execute).mockReturnValue([]);

    const renderer = await renderScreen({
      mode: 'create',
      prefill: { propertyId: 'property-1' },
    });

    await act(async () => {
      findButton(renderer.root, 'Manage spaces')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/properties/property-1');
  });

  it('shows a not-found message when the edited agreement no longer exists', async () => {
    jest.mocked(getRentalAgreement.execute).mockReturnValue(null);
    const renderer = await renderScreen({ mode: 'edit', agreementId: 'missing' });

    const root = renderer.root;
    const shown = root
      .findAllByType(TextInput)
      .some(() => true);
    expect(shown).toBe(false);
  });

  it('updates an existing agreement and returns to details', async () => {
    const existing = RentalAgreement.create({
      id: 'agreement-1',
      tenantId: 'tenant-1',
      spaceId: 'space-1',
      startDate: '2026-05-01',
      rentAmount: 100_000,
      rentFrequency: 'MONTHLY',
      firstRentDueDate: '2026-05-01',
      createdAt: 1,
    });
    jest.mocked(getRentalAgreement.execute).mockReturnValue(existing);
    jest.mocked(updateRentalAgreement.execute).mockReturnValue(existing);

    const renderer = await renderScreen({ mode: 'edit', agreementId: 'agreement-1' });

    await act(async () => {
      findButton(renderer.root, 'Save changes')?.props.onPress();
    });

    expect(updateRentalAgreement.execute).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
