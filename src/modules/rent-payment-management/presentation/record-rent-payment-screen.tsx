import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import { useTranslation } from '../../../shared/i18n';
import {
  formatDisplayAmount,
  minorToEditable,
  parseMajorToMinor,
} from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import {
  Card,
  palette,
  PrimaryButton,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import { getTenant, listTenants } from '../../tenant-management/infrastructure/composition-root';
import type { Tenant } from '../../tenant-management/domain/tenant';
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/payment';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import {
  getAgreementRent,
  getRentSummary,
  recordRentPayment,
} from '../infrastructure/composition-root';
import { allocatePayment, type AllocatableObligation } from './payment-allocation';
import { paymentErrorKey } from './payment-error-message';
import { methodLabel, RentMessage, SecondaryButton, TextLink } from './rent-ui';

type Step = 'WHO' | 'MONEY' | 'REVIEW' | 'DONE';

interface AllocationEdit {
  installmentId: string;
  dueDate: CalendarDateString;
  remainingAmount: number;
  amountText: string;
}

interface RecordRentPaymentScreenProps {
  agreementId?: string;
  tenantId?: string;
}

const clock = new SystemClock();

function toObligations(summary: RentAgreementSummary): AllocatableObligation[] {
  return summary.obligations.map((row) => ({
    installmentId: row.installment.id,
    dueDate: row.installment.dueDate,
    remainingAmount: row.remainingAmount,
  }));
}

/**
 * Guided three-step record-payment flow: choose who is paying, enter the money
 * received, then review the oldest-outstanding-first split before saving. The
 * landlord can adjust any applied amount; saving is blocked until the whole
 * payment is allocated and every amount is valid.
 */
export function RecordRentPaymentScreen({ agreementId, tenantId }: RecordRentPaymentScreenProps) {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<Step>(agreementId !== undefined ? 'MONEY' : 'WHO');
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(tenantId ?? null);
  const [tenantQuery, setTenantQuery] = useState('');
  const [tenantResults, setTenantResults] = useState<Tenant[]>([]);
  const [tenantSummaries, setTenantSummaries] = useState<RentAgreementSummary[]>(() =>
    tenantId !== undefined ? getRentSummary.execute({ tenantId }) : [],
  );
  const [summary, setSummary] = useState<RentAgreementSummary | null>(() =>
    agreementId !== undefined ? getAgreementRent.execute({ agreementId }) : null,
  );
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [date, setDate] = useState(() => clock.today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<AllocationEdit[]>([]);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(() => {
    if (agreementId !== undefined) {
      setSummary(getAgreementRent.execute({ agreementId }));
    } else if (tenantId !== undefined) {
      setTenantSummaries(getRentSummary.execute({ tenantId }));
    }
  }, [agreementId, tenantId]);

  useFocusEffect(reload);

  const searchTenants = (value: string) => {
    setTenantQuery(value);
    setError(undefined);
    setTenantResults(listTenants.execute({ search: value }).tenants);
  };

  const chooseTenant = (candidate: Tenant) => {
    setError(undefined);
    setTenantResults([]);
    setTenantQuery('');
    setTenantSummaries(getRentSummary.execute({ tenantId: candidate.id }));
    setPendingTenantId(candidate.id);
  };

  const chooseAgreement = (candidate: RentAgreementSummary) => {
    setError(undefined);
    setSummary(candidate);
    setStep('MONEY');
  };

  if (step === 'WHO') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={rentStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.record.title')}`}</Text>
        <Text style={styles.subtitle}>{t('rent.record.stepLabel', { current: 1, total: 3 })}</Text>
        <Text style={rentStyles.stepTitle}>{t('rent.record.stepWho')}</Text>

        {pendingTenantId === null ? (
          <Card>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('rent.record.searchTenant')}</Text>
              <TextInput
                value={tenantQuery}
                onChangeText={searchTenants}
                placeholder={t('rent.record.searchTenant')}
                accessibilityLabel={t('rent.record.searchTenant')}
                style={styles.input}
              />
            </View>
            {tenantResults.length === 0 ? (
              <Text style={rentStyles.muted}>{t('rent.record.noTenants')}</Text>
            ) : (
              tenantResults.map((candidate) => (
                <Pressable
                  key={candidate.id}
                  onPress={() => chooseTenant(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={candidate.fullName}
                  style={({ pressed }) => (pressed ? rentStyles.pressed : undefined)}
                >
                  <Text style={rentStyles.option}>{candidate.fullName}</Text>
                </Pressable>
              ))
            )}
          </Card>
        ) : (
          <Card>
            <Text style={rentStyles.stepTitle}>{t('rent.record.selectAgreement')}</Text>
            {tenantSummaries.length === 0 ? (
              <Text style={rentStyles.muted}>{t('rent.record.noAgreements')}</Text>
            ) : (
              tenantSummaries.map((candidate) => (
                <Pressable
                  key={candidate.agreement.id}
                  onPress={() => chooseAgreement(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={t('rent.action.recordPayment')}
                  style={({ pressed }) => (pressed ? rentStyles.pressed : undefined)}
                >
                  <Text style={rentStyles.option}>
                    {`${formatDisplayAmount(candidate.agreement.rentAmount, locale)} · ${t(
                      'rent.agreement.outstanding',
                    )} ${formatDisplayAmount(candidate.totalOutstanding, locale)}`}
                  </Text>
                </Pressable>
              ))
            )}
            <SecondaryButton
              title={t('rent.record.changeTenant')}
              onPress={() => {
                setPendingTenantId(null);
                setTenantSummaries([]);
              }}
            />
          </Card>
        )}

        {error !== undefined ? <Text style={styles.fieldError}>{error}</Text> : null}
        <TextLink title={t('common.back')} onPress={() => router.back()} />
      </ScrollView>
    );
  }

  if (summary === null) {
    return (
      <RentMessage
        title={t('rent.agreement.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const obligations = toObligations(summary);
  const outstanding = obligations.reduce((total, item) => total + item.remainingAmount, 0);
  const tenant = getTenant.execute({ id: summary.agreement.tenantId });
  const amountMinor = parseMajorToMinor(amount) ?? 0;

  const startReview = () => {
    setError(undefined);
    if (amountMinor <= 0) {
      setError(t('rent.error.amountInvalid'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError(t('rent.error.dateInvalid'));
      return;
    }
    const planned = allocatePayment(obligations, amountMinor);
    if (planned.length === 0) {
      setError(t('rent.error.notFullyApplied'));
      return;
    }
    const byId = new Map(obligations.map((item) => [item.installmentId, item]));
    setAllocations(
      planned.map((item) => {
        const obligation = byId.get(item.installmentId)!;
        return {
          installmentId: item.installmentId,
          dueDate: obligation.dueDate,
          remainingAmount: obligation.remainingAmount,
          amountText: minorToEditable(item.amount),
        };
      }),
    );
    setStep('REVIEW');
  };

  if (step === 'DONE') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={rentStyles.content}>
        <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.record.doneTitle')}`}</Text>
        <Card>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('rent.record.amount')}</Text>
            <Text style={rentStyles.totalValue}>{formatDisplayAmount(amountMinor, locale)}</Text>
          </View>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('rent.record.date')}</Text>
            <Text style={rentStyles.value}>{date}</Text>
          </View>
          <Text style={rentStyles.muted}>
            {t('rent.record.doneBalance', { amount: formatDisplayAmount(outstanding, locale) })}
          </Text>
        </Card>
        {paymentId !== null ? (
          <PrimaryButton
            title={t('rent.record.viewPayment')}
            onPress={() => router.replace(`/rent/payments/${paymentId}`)}
          />
        ) : null}
        <SecondaryButton
          title={t('rent.record.recordAnother')}
          onPress={() => {
            setAmount('');
            setReference('');
            setNotes('');
            setAllocations([]);
            setPaymentId(null);
            setError(undefined);
            reload();
            setStep('MONEY');
          }}
        />
        <TextLink title={t('common.back')} onPress={() => router.back()} />
      </ScrollView>
    );
  }

  if (step === 'REVIEW') {
    const parsed = allocations.map((allocation) => ({
      allocation,
      minor: parseMajorToMinor(allocation.amountText),
    }));
    const totalApplied = parsed.reduce((total, row) => total + (row.minor ?? 0), 0);
    const leftToAllocate = amountMinor - totalApplied;
    const overflows = parsed.some(
      (row) => row.minor !== null && row.minor > row.allocation.remainingAmount,
    );
    const canSave =
      !overflows &&
      leftToAllocate === 0 &&
      parsed.length > 0 &&
      parsed.every((row) => row.minor !== null && row.minor > 0);

    const confirm = () => {
      setError(undefined);
      if (!canSave) {
        setError(overflows ? t('rent.error.allocationExceeds') : t('rent.error.notFullyApplied'));
        return;
      }
      setSubmitting(true);
      try {
        const payment = recordRentPayment.execute({
          agreementId: summary.agreement.id,
          amount: amountMinor,
          paymentDate: date.trim(),
          method,
          reference,
          notes,
          allocations: parsed.map((row) => ({
            installmentId: row.allocation.installmentId,
            amount: row.minor!,
          })),
        });
        setPaymentId(payment.id);
        setSummary(getAgreementRent.execute({ agreementId: summary.agreement.id }));
        setStep('DONE');
      } catch (caught) {
        setError(t(paymentErrorKey(caught)));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={rentStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.record.title')}`}</Text>
        <Text style={styles.subtitle}>{t('rent.record.stepLabel', { current: 3, total: 3 })}</Text>

        <Card>
          <Text style={rentStyles.stepTitle}>{t('rent.record.confirmTitle')}</Text>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('agreements.details.tenant')}</Text>
            <Text style={rentStyles.value}>{tenant?.fullName ?? t('rent.payment.none')}</Text>
          </View>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('rent.record.amount')}</Text>
            <Text style={rentStyles.value}>{formatDisplayAmount(amountMinor, locale)}</Text>
          </View>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('rent.record.date')}</Text>
            <Text style={rentStyles.value}>{date}</Text>
          </View>
          <View style={rentStyles.row}>
            <Text style={rentStyles.label}>{t('rent.record.method')}</Text>
            <Text style={rentStyles.value}>{methodLabel(t, method)}</Text>
          </View>
        </Card>

        <Card>
          <Text style={rentStyles.stepTitle}>{t('rent.record.allocationsTitle')}</Text>
          {allocations.map((allocation, index) => (
            <View key={allocation.installmentId} style={styles.field}>
              <Text style={rentStyles.label}>
                {`${allocation.dueDate} · ${t('rent.record.remaining')} ${formatDisplayAmount(
                  allocation.remainingAmount,
                  locale,
                )}`}
              </Text>
              <TextInput
                value={allocation.amountText}
                onChangeText={(value) =>
                  setAllocations((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, amountText: value } : row,
                    ),
                  )
                }
                keyboardType="decimal-pad"
                accessibilityLabel={`${t('rent.record.applyAmount')} ${allocation.dueDate}`}
                style={styles.input}
              />
            </View>
          ))}
          <Text style={rentStyles.muted}>
            {t('rent.record.totalAllocated', { amount: formatDisplayAmount(totalApplied, locale) })}
          </Text>
          <Text style={rentStyles.muted}>
            {t('rent.record.leftToAllocate', {
              amount: formatDisplayAmount(Math.max(0, leftToAllocate), locale),
            })}
          </Text>
        </Card>

        {error !== undefined ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton
          title={t('rent.record.confirm')}
          onPress={confirm}
          disabled={!canSave}
          loading={submitting}
        />
        <SecondaryButton title={t('common.back')} onPress={() => setStep('MONEY')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={rentStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.record.title')}`}</Text>
      <Text style={styles.subtitle}>{t('rent.record.stepLabel', { current: 2, total: 3 })}</Text>
      <Text style={rentStyles.stepTitle}>{t('rent.record.stepMoney')}</Text>

      <Card>
        <Text style={rentStyles.muted}>
          {`${tenant?.fullName ?? ''} · ${t('rent.record.totalOutstanding', {
            amount: formatDisplayAmount(outstanding, locale),
          })}`}
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('rent.record.amount')}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={t('rent.record.amountPlaceholder')}
            keyboardType="decimal-pad"
            accessibilityLabel={t('rent.record.amount')}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('rent.record.method')}</Text>
          <View style={rentStyles.methods}>
            {PAYMENT_METHODS.map((candidate) => (
              <Pressable
                key={candidate}
                onPress={() => setMethod(candidate)}
                accessibilityRole="button"
                accessibilityLabel={methodLabel(t, candidate)}
                style={[rentStyles.method, candidate === method ? rentStyles.methodSelected : null]}
              >
                <Text
                  style={
                    candidate === method ? rentStyles.methodTextSelected : rentStyles.methodText
                  }
                >
                  {methodLabel(t, candidate)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('rent.record.date')}</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            accessibilityLabel={t('rent.record.date')}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('rent.record.reference')}</Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            placeholder={t('rent.record.referencePlaceholder')}
            accessibilityLabel={t('rent.record.reference')}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('rent.record.notes')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('rent.record.notesPlaceholder')}
            accessibilityLabel={t('rent.record.notes')}
            style={styles.input}
          />
        </View>
      </Card>

      {error !== undefined ? <Text style={styles.fieldError}>{error}</Text> : null}
      <PrimaryButton title={t('rent.record.next')} onPress={startReview} disabled={outstanding <= 0} />
      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}

const rentStyles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xl,
    gap: spacing.l,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  value: {
    fontSize: 16,
    color: palette.text,
  },
  muted: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
  row: {
    gap: spacing.xs,
  },
  option: {
    fontSize: 17,
    color: palette.primary,
    fontWeight: '600',
    paddingVertical: spacing.s,
  },
  pressed: {
    opacity: 0.7,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  method: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: palette.background,
  },
  methodSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  methodText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  methodTextSelected: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
