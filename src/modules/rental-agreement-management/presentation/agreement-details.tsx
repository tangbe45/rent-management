import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import {
  Card,
  KeyboardSafeContainer,
  palette,
  PrimaryButton,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { RentalAgreement, RentalAgreementLifecycle } from '../domain/rental-agreement';
import { SecondaryButton, TextLink, formatTimestamp } from './agreement-ui';

interface AgreementDetailsProps {
  agreement: RentalAgreement;
  lifecycle: RentalAgreementLifecycle;
  tenantName: string | null;
  propertyName: string | null;
  spaceName: string | null;
  dueDates: readonly CalendarDateString[];
  nextDueDate: CalendarDateString | null;
  error?: string;
  terminating: boolean;
  terminationDate: string;
  terminationError?: string;
  onTerminationDateChange: (value: string) => void;
  onStartTermination: () => void;
  onCancelTermination: () => void;
  onConfirmTermination: () => void;
  onOpenRent?: () => void;
  onEdit: () => void;
  onBack: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailsStyles.row}>
      <Text style={detailsStyles.label}>{label}</Text>
      <Text style={detailsStyles.value}>{value}</Text>
    </View>
  );
}

export function AgreementDetails({
  agreement,
  lifecycle,
  tenantName,
  propertyName,
  spaceName,
  dueDates,
  nextDueDate,
  error,
  terminating,
  terminationDate,
  terminationError,
  onTerminationDateChange,
  onStartTermination,
  onCancelTermination,
  onConfirmTermination,
  onOpenRent,
  onEdit,
  onBack,
}: AgreementDetailsProps) {
  const { t, locale } = useTranslation();
  const frequencyLabel = t(`agreements.frequency.${agreement.rentFrequency}` as TranslationKey);
  const lifecycleLabel = t(`agreements.lifecycle.${lifecycle}` as TranslationKey);
  const noneLabel = t('agreements.details.none');
  const lastScheduledDate = dueDates.length > 0 ? dueDates[dueDates.length - 1]! : null;
  const canTerminate = lifecycle === 'ACTIVE';
  const canEdit = lifecycle !== 'TERMINATED';

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.agreements} ${t('agreements.details.title')}`}
      </Text>

      <Card>
        <View style={detailsStyles.header}>
          <Text style={detailsStyles.heading}>{tenantName ?? noneLabel}</Text>
          <Text style={detailsStyles.badge}>{lifecycleLabel}</Text>
        </View>

        <Row label={t('agreements.details.tenant')} value={tenantName ?? noneLabel} />
        <Row label={t('agreements.details.property')} value={propertyName ?? noneLabel} />
        <Row label={t('agreements.details.space')} value={spaceName ?? noneLabel} />
        <Row label={t('agreements.details.startDate')} value={agreement.startDate} />
        <Row label={t('agreements.details.endDate')} value={agreement.endDate ?? noneLabel} />
        {agreement.terminationDate !== null ? (
          <Row label={t('agreements.details.terminationDate')} value={agreement.terminationDate} />
        ) : null}
        <Row
          label={t('agreements.details.rentAmount')}
          value={`${formatDisplayAmount(agreement.rentAmount, locale)} (${frequencyLabel})`}
        />
        <Row label={t('agreements.details.firstRentDueDate')} value={agreement.firstRentDueDate} />
        <Row
          label={t('agreements.details.securityDeposit')}
          value={
            agreement.securityDepositAmount === null
              ? noneLabel
              : formatDisplayAmount(agreement.securityDepositAmount, locale)
          }
        />
        {agreement.notes !== null ? (
          <Row label={t('agreements.details.notes')} value={agreement.notes} />
        ) : null}
        <Row
          label={t('agreements.details.createdAt')}
          value={formatTimestamp(agreement.createdAt, locale)}
        />
        <Row
          label={t('agreements.details.updatedAt')}
          value={formatTimestamp(agreement.updatedAt, locale)}
        />
      </Card>

      <Card>
        <Text style={detailsStyles.scheduleTitle}>{t('agreements.details.rentSchedule')}</Text>
        {nextDueDate !== null ? (
          <Row label={t('agreements.details.nextDueDate')} value={nextDueDate} />
        ) : null}
        {dueDates.length === 0 ? (
          <Text style={detailsStyles.scheduleNote}>{t('agreements.details.scheduleEmpty')}</Text>
        ) : (
          dueDates.map((dueDate) => (
            <Text key={dueDate} style={detailsStyles.value}>
              {dueDate}
            </Text>
          ))
        )}
        {lastScheduledDate !== null ? (
          <Text style={detailsStyles.scheduleNote}>
            {t('agreements.details.scheduleHorizon', { date: lastScheduledDate })}
          </Text>
        ) : null}
      </Card>

      {error !== undefined ? <Text style={styles.fieldError}>{error}</Text> : null}

      {terminating ? (
        <Card>
          <Text style={detailsStyles.heading}>{t('agreements.terminate.title')}</Text>
          <Text style={detailsStyles.scheduleNote}>{t('agreements.terminate.prompt')}</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('agreements.terminate.dateLabel')}</Text>
            <TextInput
              value={terminationDate}
              onChangeText={onTerminationDateChange}
              placeholder={t('agreements.form.datePlaceholder')}
              autoCapitalize="none"
              accessibilityLabel={t('agreements.terminate.dateLabel')}
              style={[styles.input, terminationError !== undefined ? styles.inputError : null]}
            />
            {terminationError !== undefined ? (
              <Text style={styles.fieldError}>{terminationError}</Text>
            ) : null}
          </View>
          <PrimaryButton title={t('agreements.terminate.confirm')} onPress={onConfirmTermination} />
          <SecondaryButton title={t('agreements.terminate.cancel')} onPress={onCancelTermination} />
        </Card>
      ) : (
        <>
          {canEdit ? <PrimaryButton title={t('agreements.action.edit')} onPress={onEdit} /> : null}
          {onOpenRent ? (
            <SecondaryButton title={t('rent.agreement.title')} onPress={onOpenRent} />
          ) : null}
          {canTerminate ? (
            <SecondaryButton title={t('agreements.action.terminate')} onPress={onStartTermination} />
          ) : null}
        </>
      )}

      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}

const detailsStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  heading: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary,
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
  scheduleNote: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
});
