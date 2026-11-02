import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import type { InstallmentStatus } from '../domain/installment';
import type { PaymentMethod } from '../domain/payment';
import type { PaymentReversalReason } from '../domain/payment-reversal';
import { palette, spacing, styles } from '../../account/presentation/setup/setup-ui';

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [rentUiStyles.secondary, (pressed || disabled) && rentUiStyles.pressed]}
    >
      <Text style={rentUiStyles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => (pressed ? rentUiStyles.pressed : undefined)}
    >
      <Text style={rentUiStyles.link}>{title}</Text>
    </Pressable>
  );
}

export function RentMessage({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      <SecondaryButton title={actionLabel} onPress={onAction} />
    </View>
  );
}

export function statusLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: InstallmentStatus,
): string {
  return t(`rent.status.${status}` as TranslationKey);
}

export function methodLabel(
  t: ReturnType<typeof useTranslation>['t'],
  method: PaymentMethod,
): string {
  return t(`rent.method.${method}` as TranslationKey);
}

export function reasonLabel(
  t: ReturnType<typeof useTranslation>['t'],
  reason: PaymentReversalReason,
): string {
  return t(`rent.reason.${reason}` as TranslationKey);
}

export const rentUiStyles = StyleSheet.create({
  secondary: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    color: palette.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.s,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  value: {
    fontSize: 16,
    color: palette.text,
  },
  muted: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary,
  },
  badgeOverdue: {
    color: palette.danger,
  },
  totalLabel: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  pressedCard: {
    opacity: 0.75,
  },
});
