import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { Card, PrimaryButton, styles } from '../../account/presentation/setup/setup-ui';
import type { PaymentMethod } from '../../rent-payment-management/domain/payment';
import {
  SecondaryButton,
  TextLink,
} from '../../rent-payment-management/presentation/rent-ui';
import type { ReceiptView } from '../application/get-receipt';
import { getReceipt, printReceipt, shareReceipt } from '../infrastructure/composition-root';
import { receiptErrorKey } from './receipt-error-message';
import {
  receiptAmount,
  receiptMethodLabel,
  receiptOmittedList,
  receiptSpaceTypeLabel,
  receiptUiStyles,
} from './receipt-ui';

interface ReceiptDetailsScreenProps {
  receiptId: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={receiptUiStyles.row}>
      <Text style={receiptUiStyles.label}>{label}</Text>
      <Text style={receiptUiStyles.value}>{value}</Text>
    </View>
  );
}

type ShareOrPrintKey = 'receipt.confirm.printPrompt' | 'receipt.confirm.sharePrompt';

/**
 * One immutable receipt: the frozen snapshot it was created from, plus the
 * current reversal indicator. Printing and sharing keep the PDF exactly as
 * finalized; a receipt is never regenerated.
 */
export function ReceiptDetailsScreen({ receiptId }: ReceiptDetailsScreenProps) {
  const { t, locale } = useTranslation();
  const [view, setView] = useState<ReceiptView | null>(() => getReceipt.execute(receiptId));
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const reload = useCallback(() => {
    setView(getReceipt.execute(receiptId));
  }, [receiptId]);

  useFocusEffect(reload);

  const start = () => {
    busyRef.current = true;
    setBusy(true);
  };
  const finish = () => {
    busyRef.current = false;
    setBusy(false);
  };

  const perform = async (action: () => Promise<void>) => {
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(t(receiptErrorKey(caught)));
    } finally {
      finish();
    }
  };

  /**
   * Runs a print/share action. A synchronous guard prevents a second action (or
   * a duplicate confirmation dialog) from starting while one is pending, and the
   * screen is left usable again if the dialog is cancelled or the action fails.
   */
  const runAction = (action: () => Promise<void>, confirmKey: ShareOrPrintKey | null) => {
    if (busyRef.current) {
      return;
    }
    start();
    if (confirmKey === null) {
      void perform(action);
      return;
    }
    Alert.alert(
      t('receipt.confirm.title'),
      t(confirmKey),
      [
        { text: t('receipt.confirm.cancel'), style: 'cancel', onPress: finish },
        { text: t('receipt.confirm.continue'), onPress: () => void perform(action) },
      ],
      { cancelable: true, onDismiss: finish },
    );
  };

  if (view === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('receipt.details.notFound')}</Text>
        <TextLink title={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const { receipt, reversed } = view;
  const snapshot = receipt.snapshot;
  const { property, space, tenant, payment, appearance } = snapshot;

  const explainedInline = new Set<string>();
  if (!appearance.signatureIncluded && appearance.signatureMode === 'SAVED') {
    explainedInline.add('signature');
  }
  if (!appearance.stampIncluded && appearance.stampMode === 'SAVED') {
    explainedInline.add('stamp');
  }
  const remainingOmitted = appearance.omittedAssets.filter((kind) => !explainedInline.has(kind));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={receiptUiStyles.content}>
      <Text style={styles.title}>{`${conceptEmoji.receipts} ${t('receipt.details.title')}`}</Text>

      {reversed ? (
        <Text style={receiptUiStyles.notice}>{t('receipt.details.reversedWarning')}</Text>
      ) : null}

      <Card>
        <DetailRow label={t('receipt.details.number')} value={receipt.receiptNumber} />
        <DetailRow
          label={t('receipt.details.amount')}
          value={receiptAmount(payment.amount, locale)}
        />
        <Text style={receiptUiStyles.muted}>
          {t('receipt.details.generatedOn', {
            date: new Date(snapshot.generatedAt).toLocaleString(locale),
          })}
        </Text>
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('receipt.details.tenant')}</Text>
        <DetailRow label={t('receipt.details.tenant')} value={tenant.fullName} />
        {tenant.phone !== null ? (
          <DetailRow label={t('settings.landlord.phone')} value={tenant.phone} />
        ) : null}
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('receipt.details.property')}</Text>
        <DetailRow label={t('receipt.details.property')} value={property.name} />
        <Text style={receiptUiStyles.muted}>{property.address}</Text>
        <DetailRow
          label={t('receipt.details.space')}
          value={`${space.name} (${receiptSpaceTypeLabel(t, space.type)})`}
        />
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('receipt.details.paymentDate')}</Text>
        <DetailRow label={t('receipt.details.paymentDate')} value={payment.paymentDate} />
        <DetailRow
          label={t('receipt.details.method')}
          value={receiptMethodLabel(t, payment.method as PaymentMethod)}
        />
        <DetailRow
          label={t('receipt.details.reference')}
          value={payment.reference ?? t('rent.payment.none')}
        />
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('receipt.generate.allocations')}</Text>
        {snapshot.allocations.map((allocation) => (
          <View key={allocation.installmentDueDate} style={receiptUiStyles.allocRow}>
            <Text style={receiptUiStyles.value}>{allocation.installmentDueDate}</Text>
            <Text style={receiptUiStyles.badge}>{receiptAmount(allocation.amount, locale)}</Text>
          </View>
        ))}
        <View style={receiptUiStyles.totalRow}>
          <Text style={receiptUiStyles.totalLabel}>{t('receipt.generate.total')}</Text>
          <Text style={receiptUiStyles.totalValue}>{receiptAmount(payment.amount, locale)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('settings.appearance.title')}</Text>
        <Text style={receiptUiStyles.muted}>
          {appearance.logoIncluded ? t('receipt.details.includedLogo') : t('settings.asset.notChosen')}
        </Text>
        <Text style={receiptUiStyles.muted}>
          {appearance.signatureIncluded
            ? t('receipt.details.includedSignature')
            : appearance.signatureMode === 'SAVED'
              ? t('receipt.details.omittedAssets', { list: t('receipt.details.includedSignature') })
              : t('receipt.details.signedManually')}
        </Text>
        <Text style={receiptUiStyles.muted}>
          {appearance.stampIncluded
            ? t('receipt.details.includedStamp')
            : appearance.stampMode === 'SAVED'
              ? t('receipt.details.omittedAssets', { list: t('receipt.details.includedStamp') })
              : t('receipt.details.stampedManually')}
        </Text>
        {remainingOmitted.length > 0 ? (
          <Text style={receiptUiStyles.notice}>
            {t('receipt.details.omittedAssets', {
              list: receiptOmittedList(t, remainingOmitted),
            })}
          </Text>
        ) : null}
      </Card>

      {error !== undefined ? <Text style={receiptUiStyles.notice}>{error}</Text> : null}

      <PrimaryButton
        title={t('receipt.actions.print')}
        onPress={() =>
          runAction(
            () => printReceipt.execute(receipt),
            reversed ? 'receipt.confirm.printPrompt' : null,
          )
        }
        disabled={busy}
      />
      <SecondaryButton
        title={t('receipt.actions.sharePdf')}
        onPress={() =>
          runAction(
            () => shareReceipt.execute(receipt),
            reversed ? 'receipt.confirm.sharePrompt' : null,
          )
        }
        disabled={busy}
      />
      <TextLink
        title={t('receipt.actions.backToPayment')}
        onPress={() => router.push(`/rent/payments/${receipt.paymentId}`)}
      />
      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}