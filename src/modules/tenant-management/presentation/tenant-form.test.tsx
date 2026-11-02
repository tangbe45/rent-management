import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { TenantForm, type TenantFormValues } from './tenant-form';

jest.setTimeout(30_000);

afterEach(() => {
  setLocale('en');
});

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

async function renderForm(
  overrides: {
    mode?: 'create' | 'edit';
    initialValues?: Partial<TenantFormValues>;
    error?: string;
  } = {},
) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <TenantForm
        mode={overrides.mode ?? 'create'}
        initialValues={overrides.initialValues}
        error={overrides.error}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
  });
  return { root: renderer.root, onSubmit, onCancel };
}

describe('TenantForm', () => {
  it('blocks submission and reports the missing name as required', async () => {
    const { root, onSubmit } = await renderForm();

    await act(async () => {
      findButton(root, 'Save tenant').onPress();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textShown(root, 'Tenant name is required.')).toBe(true);
  });

  it('submits every entered value', async () => {
    const { root, onSubmit } = await renderForm();

    await act(async () => {
      findInput(root, 'Full name').props.onChangeText('Amina Njeri');
      findInput(root, 'Phone number').props.onChangeText('+254 700 111 111');
      findInput(root, 'Second phone number').props.onChangeText('0222 333');
      findInput(root, 'Email').props.onChangeText('amina@example.com');
      findInput(root, 'National ID card number').props.onChangeText('0012345');
      findInput(root, 'Notes').props.onChangeText('Pays on time');
    });

    await act(async () => {
      findButton(root, 'Save tenant').onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Amina Njeri',
      phone: '+254 700 111 111',
      secondPhoneNumber: '0222 333',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
    });
  });

  it('rejects an implausible phone number and email', async () => {
    const { root, onSubmit } = await renderForm();

    await act(async () => {
      findInput(root, 'Full name').props.onChangeText('Amina Njeri');
      findInput(root, 'Phone number').props.onChangeText('abcdef');
      findInput(root, 'Email').props.onChangeText('not-an-email');
    });

    await act(async () => {
      findButton(root, 'Save tenant').onPress();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textShown(root, 'Enter a valid phone number.')).toBe(true);
    expect(textShown(root, 'Enter a valid email address.')).toBe(true);
  });

  it('pre-fills existing values and saves changes in edit mode', async () => {
    const { root, onSubmit } = await renderForm({
      mode: 'edit',
      initialValues: { fullName: 'Amina Njeri', phone: '0700 111' },
    });

    expect(findInput(root, 'Full name').props.value).toBe('Amina Njeri');

    await act(async () => {
      findInput(root, 'Full name').props.onChangeText('Amina N. Njeri');
    });
    await act(async () => {
      findButton(root, 'Save changes').onPress();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0].fullName).toBe('Amina N. Njeri');
  });

  it('renders a server-side error and cancels on request', async () => {
    const { root, onCancel } = await renderForm({ error: 'Something went wrong. Please try again.' });

    expect(textShown(root, 'Something went wrong. Please try again.')).toBe(true);

    await act(async () => {
      findButton(root, 'Cancel').onPress();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders translated labels when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderForm();

    expect(textShown(root, '🧑 Nouveau locataire')).toBe(true);
    expect(textShown(root, 'Nom complet')).toBe(true);
    expect(textShown(root, 'Enregistrer le locataire')).toBe(true);
  });
});
