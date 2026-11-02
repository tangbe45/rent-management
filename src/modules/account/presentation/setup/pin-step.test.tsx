import { Text } from 'react-native';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../../shared/i18n';
import { PinStep } from './pin-step';

afterEach(() => {
  setLocale('en');
});

interface RenderedPinStep {
  root: ReactTestInstance;
  onSubmit: jest.Mock;
}

async function renderPinStep(
  props: Partial<{ submitting: boolean; error: string | undefined }> = {},
): Promise<RenderedPinStep> {
  const onSubmit = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <PinStep
        submitting={props.submitting ?? false}
        error={props.error}
        onSubmit={onSubmit}
      />,
    );
  });
  return { root: renderer.root, onSubmit };
}

function isFieldInput(instance: ReactTestInstance, label: string): boolean {
  const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
  const parentProps = instance.parent?.props as { accessibilityLabel?: string } | undefined;
  return (
    props.accessibilityLabel === label &&
    typeof props.onChangeText === 'function' &&
    parentProps?.accessibilityLabel !== label
  );
}

function findAllInputs(root: ReactTestInstance, label: string) {
  return root.findAll((instance) => isFieldInput(instance, label));
}

function findInput(root: ReactTestInstance, label: string) {
  const inputs = findAllInputs(root, label);
  expect(inputs).toHaveLength(1);
  return inputs[0]!.props as { onChangeText: (value: string) => void };
}

function findAllContinues(root: ReactTestInstance) {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === 'Continue' && typeof props.onPress === 'function';
  });
}

function findContinue(root: ReactTestInstance) {
  const buttons = findAllContinues(root);
  expect(buttons).toHaveLength(1);
  return buttons[0]!.props as { onPress: () => void; accessibilityRole: string };
}

function errorShown(root: ReactTestInstance, message: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === message);
}

describe('PinStep', () => {
  it('renders distinct Create PIN and Confirm PIN fields plus the Continue action', async () => {
    const { root } = await renderPinStep();

    expect(findAllInputs(root, 'Choose a 4-digit PIN')).toHaveLength(1);
    expect(findAllInputs(root, 'Confirm your PIN')).toHaveLength(1);
    expect(findAllContinues(root)).toHaveLength(1);
  });

  it('shows a validation message for a PIN that is not exactly 4 digits', async () => {
    const { root, onSubmit } = await renderPinStep();

    await act(async () => {
      findInput(root, 'Choose a 4-digit PIN').onChangeText('12');
      findInput(root, 'Confirm your PIN').onChangeText('12');
    });
    await act(async () => {
      findContinue(root).onPress();
    });

    expect(errorShown(root, 'Your PIN must be exactly 4 digits.')).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation message when the PINs do not match', async () => {
    const { root, onSubmit } = await renderPinStep();

    await act(async () => {
      findInput(root, 'Choose a 4-digit PIN').onChangeText('1234');
      findInput(root, 'Confirm your PIN').onChangeText('9999');
    });
    await act(async () => {
      findContinue(root).onPress();
    });

    expect(errorShown(root, 'The PINs do not match.')).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the PIN when both fields contain the same 4-digit value', async () => {
    const { root, onSubmit } = await renderPinStep();

    await act(async () => {
      findInput(root, 'Choose a 4-digit PIN').onChangeText('1234');
      findInput(root, 'Confirm your PIN').onChangeText('1234');
    });
    await act(async () => {
      findContinue(root).onPress();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('surfaces an upstream (server-side) error message', async () => {
    const { root } = await renderPinStep({ error: 'This application has already been set up.' });

    expect(errorShown(root, 'This application has already been set up.')).toBe(true);
  });

  it('renders the PIN fields in French when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderPinStep();

    expect(findAllInputs(root, 'Choisissez un code PIN à 4 chiffres')).toHaveLength(1);
    expect(findAllInputs(root, 'Confirmez votre code PIN')).toHaveLength(1);

    const continues = root.findAll((instance) => {
      const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
      return props.accessibilityLabel === 'Continuer' && typeof props.onPress === 'function';
    });
    expect(continues).toHaveLength(1);
  });

  it('keeps the Continue action reachable while a field is focused', async () => {
    const { root } = await renderPinStep();

    await act(async () => {
      findInput(root, 'Confirm your PIN').onChangeText('1234');
      findInput(root, 'Choose a 4-digit PIN').onChangeText('1234');
    });

    const continues = findAllContinues(root);
    expect(continues).toHaveLength(1);
    expect(continues[0]!.props.accessibilityRole).toBe('button');
  });
});