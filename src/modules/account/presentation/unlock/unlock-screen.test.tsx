import { router } from 'expo-router';
import { KeyboardAvoidingView, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../../shared/i18n';
import { authenticateWithPin, getOwnerProfile } from '../../infrastructure/composition-root';
import { UnlockScreen } from './unlock-screen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

jest.mock('../../infrastructure/composition-root', () => ({
  authenticateWithPin: { execute: jest.fn() },
  getOwnerProfile: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function findPinInput(root: ReactTestInstance): ReactTestInstance {
  const inputs = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    const parentProps = instance.parent?.props as { accessibilityLabel?: string } | undefined;
    return (
      props.accessibilityLabel === 'Enter your PIN' &&
      typeof props.onChangeText === 'function' &&
      parentProps?.accessibilityLabel !== 'Enter your PIN'
    );
  });
  expect(inputs).toHaveLength(1);
  return inputs[0]!;
}

function findUnlockButtons(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === 'Unlock' && typeof props.onPress === 'function';
  });
}

function findUnlockButton(root: ReactTestInstance): ReactTestInstance {
  const buttons = findUnlockButtons(root);
  expect(buttons).toHaveLength(1);
  return buttons[0]!;
}

function errorShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

function typedTexts(root: ReactTestInstance): unknown[] {
  return root.findAllByType(Text).map((instance) => instance.props.children);
}

async function renderUnlockScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<UnlockScreen />);
  });
  return renderer;
}

async function enterPin(root: ReactTestInstance, pin: string): Promise<void> {
  await act(async () => {
    findPinInput(root).props.onChangeText(pin);
  });
}

async function pressUnlock(root: ReactTestInstance): Promise<void> {
  await act(async () => {
    await findUnlockButton(root).props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getOwnerProfile.execute).mockResolvedValue({ fullName: 'Jean Lucien' });
  jest.mocked(authenticateWithPin.execute).mockResolvedValue(false);
});

afterEach(() => {
  setLocale('en');
});

describe('UnlockScreen', () => {
  it('renders an obscured, numeric, 4-digit PIN input with an Unlock action inside the keyboard-safe container', async () => {
    const { root } = await renderUnlockScreen();

    const inputProps = findPinInput(root).props as {
      keyboardType?: string;
      secureTextEntry?: boolean;
      maxLength?: number;
      value?: string;
    };
    expect(inputProps.keyboardType).toBe('number-pad');
    expect(inputProps.secureTextEntry).toBe(true);
    expect(inputProps.maxLength).toBe(4);
    expect(inputProps.value).toBe('');
    expect(findUnlockButton(root).props.accessibilityRole).toBe('button');

    const containers = root.findAllByType(KeyboardAvoidingView);
    expect(containers.length).toBeGreaterThan(0);
    expect(containers[0]!.props.behavior).toBe('padding');
  });

  it('welcomes the owner by first name', async () => {
    const { root } = await renderUnlockScreen();

    expect(
      typedTexts(root).some((value) => typeof value === 'string' && value.includes('Welcome back')),
    ).toBe(true);
    expect(typedTexts(root)).toContain('Jean');
  });

  it('renders the PIN label and unlock action in French when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderUnlockScreen();

    expect(
      typedTexts(root).some((value) => typeof value === 'string' && value.includes('Bon retour')),
    ).toBe(true);
    const frenchInputs = root.findAll((instance) => {
      const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
      const parentProps = instance.parent?.props as { accessibilityLabel?: string } | undefined;
      return (
        props.accessibilityLabel === 'Saisissez votre code PIN' &&
        typeof props.onChangeText === 'function' &&
        parentProps?.accessibilityLabel !== 'Saisissez votre code PIN'
      );
    });
    expect(frenchInputs).toHaveLength(1);
    const frenchUnlockButtons = root.findAll((instance) => {
      const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
      return props.accessibilityLabel === 'Déverrouiller' && typeof props.onPress === 'function';
    });
    expect(frenchUnlockButtons).toHaveLength(1);
  });

  it('ignores non-numeric characters and never accepts more than 4 digits', async () => {
    const { root } = await renderUnlockScreen();

    await enterPin(root, '1a2b3c4d');
    expect(findPinInput(root).props.value).toBe('1234');

    await enterPin(root, '987654321');
    expect(findPinInput(root).props.value).toBe('9876');
  });

  it.each(['', '12'])('blocks the incomplete PIN %p without calling the use case', async (pin) => {
    const { root } = await renderUnlockScreen();

    await enterPin(root, pin);
    await pressUnlock(root);

    expect(errorShown(root, 'Please enter your 4-digit PIN.')).toBe(true);
    expect(authenticateWithPin.execute).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a clear error and clears the field when the PIN is rejected', async () => {
    const { root } = await renderUnlockScreen();

    await enterPin(root, '9999');
    await pressUnlock(root);

    expect(authenticateWithPin.execute).toHaveBeenCalledWith({ pin: '9999' });
    expect(errorShown(root, 'Incorrect PIN. Please try again.')).toBe(true);
    expect(findPinInput(root).props.value).toBe('');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('enters the authenticated area when the correct PIN is verified', async () => {
    jest.mocked(authenticateWithPin.execute).mockResolvedValue(true);
    const { root } = await renderUnlockScreen();

    await enterPin(root, '1234');
    await pressUnlock(root);

    expect(authenticateWithPin.execute).toHaveBeenCalledWith({ pin: '1234' });
    expect(router.replace).toHaveBeenCalledWith('/dashboard');
    expect(errorShown(root, 'Incorrect PIN. Please try again.')).toBe(false);
  });

  it('shows a generic message when authentication fails unexpectedly', async () => {
    jest.mocked(authenticateWithPin.execute).mockRejectedValue(new Error('secure store down'));
    const { root } = await renderUnlockScreen();

    await enterPin(root, '1234');
    await pressUnlock(root);

    expect(errorShown(root, 'Something went wrong. Please try again.')).toBe(true);
    expect(findPinInput(root).props.value).toBe('');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
