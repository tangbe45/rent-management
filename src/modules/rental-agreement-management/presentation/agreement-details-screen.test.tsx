import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { Property } from '../../property-management/domain/property';
import { PropertySpace } from '../../property-management/domain/property-space';
import {
  getProperty,
  getPropertySpace,
} from '../../property-management/infrastructure/composition-root';
import { Tenant } from '../../tenant-management/domain/tenant';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import { RentalAgreement } from '../domain/rental-agreement';
import {
  getRentalAgreement,
  getRentSchedule,
  terminateRentalAgreement,
} from '../infrastructure/composition-root';
import { AgreementDetailsScreen } from './agreement-details-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getRentalAgreement: { execute: jest.fn() },
  getRentSchedule: { execute: jest.fn() },
  terminateRentalAgreement: { execute: jest.fn() },
}));

jest.mock('../../property-management/infrastructure/composition-root', () => ({
  getProperty: { execute: jest.fn() },
  getPropertySpace: { execute: jest.fn() },
}));

jest.mock('../../tenant-management/infrastructure/composition-root', () => ({
  getTenant: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const AGREEMENT = RentalAgreement.create({
  id: 'agreement-1',
  tenantId: 'tenant-1',
  spaceId: 'space-1',
  startDate: '2020-01-01',
  rentAmount: 100_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2020-01-01',
  createdAt: 1,
});

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some(
      (instance) =>
        typeof instance.props.children === 'string' && instance.props.children.includes(fragment),
    );
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AgreementDetailsScreen agreementId="agreement-1" />);
  });
  return renderer;
}

describe('AgreementDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRentalAgreement.execute).mockReturnValue(AGREEMENT);
    jest.mocked(getRentSchedule.execute).mockReturnValue({
      agreement: AGREEMENT,
      dueDates: ['2026-11-01', '2026-12-01'],
      nextDueDate: '2026-11-01',
    });
    jest.mocked(getTenant.execute).mockReturnValue(
      Tenant.create({ id: 'tenant-1', fullName: 'Amina Njeri', createdAt: 1 }),
    );
    jest.mocked(getPropertySpace.execute).mockReturnValue(
      PropertySpace.create({
        id: 'space-1',
        propertyId: 'property-1',
        parentSpaceId: null,
        name: 'Apartment A',
        type: 'APARTMENT',
        rentable: true,
        createdAt: 1,
      }),
    );
    jest.mocked(getProperty.execute).mockReturnValue(
      Property.create({
        id: 'property-1',
        name: 'Sunset Apartments',
        address: '1 Main Street',
        createdAt: 1,
      }),
    );
  });

  it('shows the agreement, its names, derived lifecycle and schedule', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, 'Sunset Apartments')).toBe(true);
    expect(textShown(root, 'Apartment A')).toBe(true);
    expect(textShown(root, 'Active')).toBe(true);
    expect(textShown(root, '2026-11-01')).toBe(true);
    expect(textContaining(root, '1,000 FCFA (Monthly)')).toBe(true);
    expect(textContaining(root, '.00')).toBe(false);
  });

  it('terminates the agreement with the entered date', async () => {
    jest.mocked(terminateRentalAgreement.execute).mockReturnValue(AGREEMENT);

    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Terminate')?.props.onPress();
    });
    expect(findButton(root, 'Confirm termination')).toBeDefined();

    await act(async () => {
      findButton(root, 'Confirm termination')?.props.onPress();
    });

    expect(terminateRentalAgreement.execute).toHaveBeenCalledWith({
      id: 'agreement-1',
      terminationDate: new SystemClock().today(),
    });
  });

  it('offers edit for an active agreement and opens its editor', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Edit')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/agreements/agreement-1/edit');
  });

  it('shows a not-found message when the agreement is missing', async () => {
    jest.mocked(getRentalAgreement.execute).mockReturnValue(null);
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Rental agreement not found.')).toBe(true);
    expect(findButton(renderer.root, 'Edit')).toBeUndefined();
  });
});
