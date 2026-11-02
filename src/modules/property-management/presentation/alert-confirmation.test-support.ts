import { Alert } from 'react-native';
import { act } from 'react-test-renderer';

interface AlertButtonLike {
  text?: string;
  style?: string;
  onPress?: () => void;
}

/**
 * Installs a no-op native alert so archive/restore confirmations can be driven
 * by the tests. Call once per test file, before rendering a screen.
 */
export function installAlertSpy(): void {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
}

function latestButtons(): AlertButtonLike[] {
  const call = jest.mocked(Alert.alert).mock.calls.at(-1);
  expect(call).toBeDefined();
  return (call![2] as AlertButtonLike[] | undefined) ?? [];
}

/** Presses the destructive button of the most recent confirmation dialog. */
export function confirmLatestAlert(): void {
  const confirm = latestButtons().find((button) => button.style !== 'cancel');
  expect(confirm?.onPress).toBeDefined();
  act(() => {
    confirm!.onPress!();
  });
}

/** Presses cancel on the most recent confirmation dialog. */
export function cancelLatestAlert(): void {
  const cancel = latestButtons().find((button) => button.style === 'cancel');
  expect(cancel).toBeDefined();
  act(() => {
    cancel!.onPress?.();
  });
}

/** Returns the message of the most recent confirmation dialog. */
export function latestAlertMessage(): string | undefined {
  const call = jest.mocked(Alert.alert).mock.calls.at(-1);
  return call?.[1];
}
