import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import {
  AgreementForm,
  type AgreementFormInitialValues,
  type AgreementFormOption,
} from './agreement-form';

jest.setTimeout(30_000);

const TENANT_OPTION: AgreementFormOption = {
  id: 'tenant-1',
  label: 'Amina Njeri',
  hint: '0700 000 000',
};
const PROPERTY_OPTION: AgreementFormOption = {
  id: 'property-1',
  label: 'Sunset Apartments',
  hint: '1 Main Street',
};
const SECOND_PROPERTY_OPTION: AgreementFormOption = {
  id: 'property-2',
  label: 'Lake House',
  hint: '2 Lake Road',
};
const SPACE_OPTION: AgreementFormOption = {
  id: 'space-1',
  label: 'Apartment A',
  hint: '🏠 Apartment',
  depth: 0,
};

const EMPTY_VALUES: AgreementFormInitialValues = {
  tenantId: '',
  propertyId: '',
  spaceId: '',
  startDate: '',
  endDate: '',
  firstRentDueDate: '',
  rentAmount: '',
  rentFrequency: 'MONTHLY',
  securityDeposit: '',
  notes: '',
};

const COMPLETE_VALUES: AgreementFormInitialValues = {
  ...EMPTY_VALUES,
  tenantId: 'tenant-1',
  propertyId: 'property-1',
  spaceId: 'space-1',
  startDate: '2026-01-01',
  firstRentDueDate: '2026-01-10',
  rentAmount: '1000',
};

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

function findInput(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    return typeof props.onChangeText === 'function' && props.accessibilityLabel === label;
  })[0];
}

function textContent(node: ReactTestInstance): string {
  const children = (node.props as { children?: unknown }).children;
  if (children === undefined || children === null) {
    return '';
  }
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('');
  }
  return typeof children === 'string' ? children : '';
}

function containsText(root: ReactTestInstance, text: string): boolean {
  return root.findAllByType(Text).some((node) => textContent(node).includes(text));
}

function countText(root: ReactTestInstance, text: string): number {
  return root.findAllByType(Text).filter((node) => textContent(node).includes(text)).length;
}

async function renderForm(
  overrides: Partial<Parameters<typeof AgreementForm>[0]> = {},
): Promise<{ renderer: ReactTestRenderer; props: Parameters<typeof AgreementForm>[0] }> {
  const props: Parameters<typeof AgreementForm>[0] = {
    mode: 'create',
    locked: false,
    tenantOptions: [TENANT_OPTION],
    propertyOptions: [PROPERTY_OPTION],
    spaceOptions: [SPACE_OPTION],
    initialValues: EMPTY_VALUES,
    onPropertyChange: jest.fn(),
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    onAddTenant: jest.fn(),
    onAddProperty: jest.fn(),
    onManageSpaces: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AgreementForm {...props} />);
  });
  return { renderer, props };
}

describe('AgreementForm', () => {
  beforeEach(() => {
    setLocale('en');
  });

  afterEach(() => {
    setLocale('en');
  });

  it('renders the four guided sections and a review summary', async () => {
    const { renderer } = await renderForm();
    const { root } = renderer;

    expect(containsText(root, 'Who is renting?')).toBe(true);
    expect(containsText(root, 'What are they renting?')).toBe(true);
    expect(containsText(root, 'How much is the rent?')).toBe(true);
    expect(containsText(root, 'Agreement dates')).toBe(true);
    expect(containsText(root, 'When does the agreement start and end?')).toBe(true);
    expect(containsText(root, 'Review your rental agreement')).toBe(true);
  });

  it('reflects the chosen values in the review summary', async () => {
    const { renderer } = await renderForm({ initialValues: COMPLETE_VALUES });
    const { root } = renderer;

    expect(containsText(root, '1,000 FCFA')).toBe(true);
    expect(containsText(root, '2026-01-10')).toBe(true);
    expect(containsText(root, 'No planned end date')).toBe(true);
    expect(countText(root, 'Not chosen')).toBe(0);
  });

  it('lets the landlord choose a tenant, property and space', async () => {
    const { renderer } = await renderForm();
    const { root } = renderer;

    expect(countText(root, 'Not chosen')).toBeGreaterThan(0);

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

    expect(countText(root, 'Not chosen')).toBe(0);
  });

  it('clears the selected space when the property changes', async () => {
    const { renderer } = await renderForm({
      propertyOptions: [PROPERTY_OPTION, SECOND_PROPERTY_OPTION],
      initialValues: COMPLETE_VALUES,
    });
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Change property')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Lake House')?.props.onPress();
    });

    expect(countText(root, 'Not chosen')).toBe(1);
    expect(findInput(root, 'Search tenants')).toBeUndefined();
  });

  it('captures start, first-payment and optional end dates', async () => {
    const { renderer } = await renderForm();
    const { root } = renderer;

    await act(async () => {
      findInput(root, 'Move-in or agreement start date')?.props.onChangeText('2026-03-01');
    });
    await act(async () => {
      findInput(root, 'When is the first rent payment due?')?.props.onChangeText('2026-03-05');
    });

    expect(containsText(root, '2026-03-01')).toBe(true);
    expect(containsText(root, '2026-03-05')).toBe(true);
    expect(containsText(root, 'No planned end date')).toBe(true);
  });

  it('blocks submission and surfaces validation messages when fields are missing', async () => {
    const { renderer, props } = await renderForm();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(containsText(root, 'Select a tenant.')).toBe(true);
    expect(containsText(root, 'A rent amount is required.')).toBe(true);
  });

  it('preserves entered values after a validation error', async () => {
    const { renderer } = await renderForm();
    const { root } = renderer;

    await act(async () => {
      findInput(root, 'Rent amount')?.props.onChangeText('500');
    });
    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });

    expect((findInput(root, 'Rent amount')?.props as { value?: string }).value).toBe('500');
  });

  it('prevents duplicate submission while a save is in progress', async () => {
    const onSubmit = jest.fn();
    const { renderer } = await renderForm({ initialValues: COMPLETE_VALUES, onSubmit });
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Save agreement')?.props.onPress();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps locked agreements read-only except for notes', async () => {
    const { renderer } = await renderForm({
      mode: 'edit',
      locked: true,
      initialValues: { ...COMPLETE_VALUES, notes: 'Existing note' },
    });
    const { root } = renderer;

    expect(containsText(root, 'This agreement has already started')).toBe(true);
    expect(containsText(root, 'Rental agreement summary')).toBe(true);
    expect(containsText(root, 'Who is renting?')).toBe(false);
    expect(findButton(root, 'Amina Njeri')).toBeUndefined();
    expect(findInput(root, 'Additional notes (optional)')).toBeDefined();
  });

  it('offers to add a tenant when none are available', async () => {
    const onAddTenant = jest.fn();
    const { renderer } = await renderForm({ tenantOptions: [], onAddTenant });
    const { root } = renderer;

    expect(containsText(root, 'No active tenants available.')).toBe(true);
    await act(async () => {
      findButton(root, 'Add a tenant')?.props.onPress();
    });
    expect(onAddTenant).toHaveBeenCalledTimes(1);
  });

  it('offers to add a property when none are available', async () => {
    const { renderer } = await renderForm({ propertyOptions: [] });
    const { root } = renderer;

    expect(containsText(root, 'No active properties available.')).toBe(true);
    expect(findButton(root, 'Add a property')).toBeDefined();
  });

  it('offers to manage spaces when the property has no rentable spaces', async () => {
    const onManageSpaces = jest.fn();
    const { renderer } = await renderForm({
      initialValues: { ...EMPTY_VALUES, propertyId: 'property-1' },
      spaceOptions: [],
      onManageSpaces,
    });
    const { root } = renderer;

    expect(containsText(root, 'No rentable spaces available in this property.')).toBe(true);
    await act(async () => {
      findButton(root, 'Manage spaces')?.props.onPress();
    });
    expect(onManageSpaces).toHaveBeenCalledTimes(1);
  });

  it('updates the selected rent frequency', async () => {
    const { renderer } = await renderForm();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Every year')?.props.onPress();
    });

    const yearly = findButton(root, 'Every year');
    expect(
      (yearly?.props as { accessibilityState?: { selected?: boolean } }).accessibilityState
        ?.selected,
    ).toBe(true);
  });

  it('renders in French when the active locale is French', async () => {
    setLocale('fr');
    const { renderer } = await renderForm();
    const { root } = renderer;

    expect(containsText(root, 'Qui loue ?')).toBe(true);
    expect(containsText(root, 'Vérifiez votre contrat de location')).toBe(true);
  });
});
