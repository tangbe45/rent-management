import { Alert } from 'react-native';

export interface LifecycleConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

/**
 * Native confirmation dialog shared by the property, space and tenant
 * archive/restore entry points. Confirming only runs the action: the
 * application-level use case still validates and may reject the operation
 * afterwards.
 */
export function confirmLifecycleAction(
  confirmation: LifecycleConfirmation,
  action: () => void,
): void {
  Alert.alert(
    confirmation.title,
    confirmation.message,
    [
      { text: confirmation.cancelLabel, style: 'cancel' },
      {
        text: confirmation.confirmLabel,
        style: confirmation.destructive ? 'destructive' : undefined,
        onPress: action,
      },
    ],
    { cancelable: true },
  );
}
