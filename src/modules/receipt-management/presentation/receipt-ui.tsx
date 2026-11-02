import { StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { formatFcfaAmount } from '../../../shared/presentation/money';
import { palette, styles } from '../../account/presentation/setup/setup-ui';
import type { PaymentMethod } from '../../rent-payment-management/domain/payment';
import { SecondaryButton, TextLink } from '../../rent-payment-management/presentation/rent-ui';

export function ReceiptMessage({
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

export function receiptAmount(amount: number, locale: string): string {
  return formatFcfaAmount(amount, locale);
}

export function receiptMethodLabel(t: ReturnType<typeof useTranslation>['t'], method: PaymentMethod): string {
  return t(`rent.method.${method}` as TranslationKey);
}

export function receiptSpaceTypeLabel(t: ReturnType<typeof useTranslation>['t'], type: string): string {
  return t(`spaces.type.${type}` as TranslationKey);
}

export function receiptAssetLabel(
  t: ReturnType<typeof useTranslation>['t'],
  kind: 'logo' | 'signature' | 'stamp',
): string {
  if (kind === 'logo') {
    return t('receipt.details.includedLogo');
  }
  return kind === 'signature'
    ? t('receipt.details.includedSignature')
    : t('receipt.details.includedStamp');
}

export function receiptOmittedList(
  t: ReturnType<typeof useTranslation>['t'],
  omitted: readonly string[],
): string {
  return omitted
    .map((kind) => receiptAssetLabel(t, kind as 'logo' | 'signature' | 'stamp'))
    .join(', ');
}

export { TextLink, SecondaryButton };

export const receiptUiStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  value: {
    fontSize: 16,
    color: palette.text,
    textAlign: 'right',
    flexShrink: 1,
  },
  valueMuted: {
    color: palette.textMuted,
  },
  muted: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary,
  },
  badgeDanger: {
    color: palette.danger,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.danger,
  },
  allocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  collectible: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
});