import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  compareCalendarDates,
  isValidCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { formatDisplayAmount, parseMajorToMinor } from '../../../shared/presentation/money';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  palette,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import {
  RENTAL_AGREEMENT_NOTES_MAX_LENGTH,
  RENT_FREQUENCIES,
  type RentFrequency,
} from '../domain/rental-agreement';
import { SecondaryButton } from './agreement-ui';

export type AgreementFormMode = 'create' | 'edit';

export interface AgreementFormOption {
  id: string;
  label: string;
  hint?: string;
  depth?: number;
}

export interface AgreementFormInitialValues {
  tenantId: string;
  propertyId: string;
  spaceId: string;
  startDate: string;
  endDate: string;
  firstRentDueDate: string;
  rentAmount: string;
  rentFrequency: RentFrequency;
  securityDeposit: string;
  notes: string;
}

export interface AgreementFormValues {
  tenantId: string;
  propertyId: string;
  spaceId: string;
  startDate: string;
  endDate: string | null;
  firstRentDueDate: string;
  rentAmountMinor: number;
  rentFrequency: RentFrequency;
  securityDepositMinor: number | null;
  notes: string | null;
}

interface AgreementFormProps {
  mode: AgreementFormMode;
  locked: boolean;
  tenantOptions: readonly AgreementFormOption[];
  propertyOptions: readonly AgreementFormOption[];
  spaceOptions: readonly AgreementFormOption[];
  initialValues: AgreementFormInitialValues;
  error?: string;
  onPropertyChange: (propertyId: string) => void;
  onSubmit: (values: AgreementFormValues) => void;
  onCancel: () => void;
  onAddTenant?: () => void;
  onAddProperty?: () => void;
  onManageSpaces?: () => void;
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={formStyles.sectionHeader}>
      <Text style={formStyles.sectionTitle}>{title}</Text>
      {hint !== undefined ? <Text style={formStyles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

function ChoiceCard({
  option,
  selected,
  onPress,
}: {
  option: AgreementFormOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.hint}
      accessibilityState={{ selected }}
      style={[
        formStyles.option,
        option.depth !== undefined ? { marginLeft: Math.min(option.depth, 4) * spacing.m } : null,
        selected ? formStyles.optionSelected : null,
      ]}
    >
      <View style={formStyles.optionBody}>
        <Text style={[formStyles.optionText, selected ? formStyles.optionTextSelected : null]}>
          {option.label}
        </Text>
        {option.hint !== undefined ? (
          <Text style={formStyles.optionHint}>{option.hint}</Text>
        ) : null}
      </View>
      {selected ? <Text style={formStyles.optionCheck}>{'✓'}</Text> : null}
    </Pressable>
  );
}

function FrequencyOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      style={[formStyles.frequencyOption, selected ? formStyles.optionSelected : null]}
    >
      <Text style={[formStyles.optionText, selected ? formStyles.optionTextSelected : null]}>
        {label}
      </Text>
      {selected ? <Text style={formStyles.optionCheck}>{'✓'}</Text> : null}
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={formStyles.reviewRow}>
      <Text style={formStyles.reviewLabel}>{label}</Text>
      <Text style={formStyles.reviewValue}>{value}</Text>
    </View>
  );
}

function SelectionPrompt({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: string;
  title: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={({ pressed }) => [formStyles.prompt, pressed ? formStyles.promptPressed : null]}
    >
      <Text style={formStyles.promptIcon}>{icon}</Text>
      <View style={formStyles.promptBody}>
        <Text style={formStyles.promptTitle}>{title}</Text>
        {hint !== undefined ? <Text style={formStyles.promptHint}>{hint}</Text> : null}
      </View>
      <Text style={formStyles.promptChevron}>{'›'}</Text>
    </Pressable>
  );
}

export function AgreementForm({
  mode,
  locked,
  tenantOptions,
  propertyOptions,
  spaceOptions,
  initialValues,
  error,
  onPropertyChange,
  onSubmit,
  onCancel,
  onAddTenant,
  onAddProperty,
  onManageSpaces,
}: AgreementFormProps) {
  const { t, locale } = useTranslation();
  const [tenantId, setTenantId] = useState(initialValues.tenantId);
  const [propertyId, setPropertyId] = useState(initialValues.propertyId);
  const [spaceId, setSpaceId] = useState(initialValues.spaceId);
  const [tenantSearch, setTenantSearch] = useState('');
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [firstRentDueDate, setFirstRentDueDate] = useState(initialValues.firstRentDueDate);
  const [rentAmount, setRentAmount] = useState(initialValues.rentAmount);
  const [rentFrequency, setRentFrequency] = useState<RentFrequency>(initialValues.rentFrequency);
  const [securityDeposit, setSecurityDeposit] = useState(initialValues.securityDeposit);
  const [notes, setNotes] = useState(initialValues.notes);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [spacePickerOpen, setSpacePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTextChange =
    (setter: (value: string) => void) =>
    (value: string): void => {
      setSubmitting(false);
      setter(value);
    };

  const visibleTenantOptions = tenantOptions.filter((option) =>
    option.label.toLowerCase().includes(tenantSearch.trim().toLowerCase()),
  );
  const selectedTenant = tenantOptions.find((option) => option.id === tenantId);
  const selectedProperty = propertyOptions.find((option) => option.id === propertyId);
  const selectedSpace = spaceOptions.find((option) => option.id === spaceId);

  const handleTenantSelect = (nextTenantId: string) => {
    setSubmitting(false);
    setTenantId(nextTenantId);
    setTenantPickerOpen(false);
  };

  const handlePropertySelect = (nextPropertyId: string) => {
    setSubmitting(false);
    setPropertyId(nextPropertyId);
    setSpaceId('');
    setSpacePickerOpen(true);
    setPropertyPickerOpen(false);
    onPropertyChange(nextPropertyId);
  };

  const handleSpaceSelect = (nextSpaceId: string) => {
    setSubmitting(false);
    setSpaceId(nextSpaceId);
    setSpacePickerOpen(false);
  };

  const handleSubmit = () => {
    if (submitting) {
      return;
    }

    const errors: Record<string, string> = {};
    const trimmedStart = startDate.trim();
    const trimmedEnd = endDate.trim();
    const trimmedFirstDue = firstRentDueDate.trim();

    if (!locked) {
      if (tenantId.length === 0) {
        errors.tenantId = t('agreements.validation.tenantRequired');
      }
      if (propertyId.length === 0) {
        errors.propertyId = t('agreements.validation.propertyRequired');
      }
      if (spaceId.length === 0) {
        errors.spaceId = t('agreements.validation.spaceRequired');
      }
      if (trimmedStart.length === 0) {
        errors.startDate = t('agreements.validation.startDateRequired');
      } else if (!isValidCalendarDate(trimmedStart)) {
        errors.startDate = t('agreements.validation.startDateInvalid');
      }
      if (trimmedEnd.length > 0 && !isValidCalendarDate(trimmedEnd)) {
        errors.endDate = t('agreements.validation.endDateInvalid');
      }
      if (trimmedFirstDue.length === 0) {
        errors.firstRentDueDate = t('agreements.validation.firstRentDueDateRequired');
      } else if (!isValidCalendarDate(trimmedFirstDue)) {
        errors.firstRentDueDate = t('agreements.validation.firstRentDueDateInvalid');
      }
      if (
        errors.startDate === undefined &&
        errors.endDate === undefined &&
        trimmedEnd.length > 0 &&
        compareCalendarDates(trimmedEnd as CalendarDateString, trimmedStart as CalendarDateString) < 0
      ) {
        errors.endDate = t('agreements.validation.endBeforeStart');
      }
      if (
        errors.firstRentDueDate === undefined &&
        errors.endDate === undefined &&
        trimmedEnd.length > 0 &&
        compareCalendarDates(trimmedFirstDue as CalendarDateString, trimmedEnd as CalendarDateString) >
          0
      ) {
        errors.firstRentDueDate = t('agreements.validation.firstDueAfterEnd');
      }

      const rentMinor = parseMajorToMinor(rentAmount);
      if (rentAmount.trim().length === 0) {
        errors.rentAmount = t('agreements.validation.rentAmountRequired');
      } else if (rentMinor === null || rentMinor <= 0) {
        errors.rentAmount = t('agreements.validation.rentAmountInvalid');
      }
      if (securityDeposit.trim().length > 0) {
        const depositMinor = parseMajorToMinor(securityDeposit);
        if (depositMinor === null || depositMinor <= 0) {
          errors.securityDeposit = t('agreements.validation.depositInvalid');
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const rentMinor = parseMajorToMinor(rentAmount);
    const depositMinor = parseMajorToMinor(securityDeposit);

    setSubmitting(true);
    onSubmit({
      tenantId,
      propertyId,
      spaceId,
      startDate: trimmedStart,
      endDate: trimmedEnd.length === 0 ? null : trimmedEnd,
      firstRentDueDate: trimmedFirstDue,
      rentAmountMinor: rentMinor ?? 0,
      rentFrequency,
      securityDepositMinor: depositMinor,
      notes: notes.trim().length === 0 ? null : notes.trim(),
    });
  };

  const tenantValue = selectedTenant?.label ?? (tenantId.length > 0 ? tenantId : t('agreements.form.notChosen'));
  const propertyValue =
    selectedProperty?.label ?? (propertyId.length > 0 ? propertyId : t('agreements.form.notChosen'));
  const spaceValue =
    selectedSpace?.label ?? (spaceId.length > 0 ? spaceId : t('agreements.form.notChosen'));

  const rentMinor = parseMajorToMinor(rentAmount);
  const rentFrequencyLabel = t(`agreements.form.frequency.${rentFrequency}`);
  const rentValue =
    rentAmount.trim().length === 0
      ? t('agreements.form.notEntered')
      : `${rentMinor !== null ? formatDisplayAmount(rentMinor, locale) : rentAmount.trim()} · ${rentFrequencyLabel}`;

  const depositMinor = parseMajorToMinor(securityDeposit);
  const depositValue =
    securityDeposit.trim().length === 0
      ? t('agreements.form.notSpecified')
      : depositMinor !== null
        ? formatDisplayAmount(depositMinor, locale)
        : securityDeposit.trim();

  const startValue = startDate.trim().length > 0 ? startDate.trim() : t('agreements.form.notEntered');
  const endValue = endDate.trim().length > 0 ? endDate.trim() : t('agreements.form.noEndDate');
  const firstRentValue =
    firstRentDueDate.trim().length > 0 ? firstRentDueDate.trim() : t('agreements.form.notEntered');

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.agreements} ${
        mode === 'create' ? t('agreements.create.title') : t('agreements.edit.title')
      }`}</Text>

      <Card>
        {locked ? (
          <Text style={formStyles.lockedNotice}>{t('agreements.form.lockedNotice')}</Text>
        ) : (
          <>
            <View style={formStyles.section}>
              <SectionHeader
                title={t('agreements.form.whoSection')}
                hint={t('agreements.form.whoHint')}
              />
              {tenantOptions.length === 0 ? (
                <View style={formStyles.emptyState}>
                  <Text style={formStyles.helper}>{t('agreements.form.tenantEmpty')}</Text>
                  {onAddTenant !== undefined ? (
                    <SecondaryButton
                      title={t('agreements.form.addTenant')}
                      onPress={onAddTenant}
                    />
                  ) : null}
                </View>
              ) : tenantPickerOpen ? (
                <>
                  <TextInput
                    value={tenantSearch}
                    onChangeText={handleTextChange(setTenantSearch)}
                    placeholder={t('agreements.form.tenantSearch')}
                    accessibilityLabel={t('agreements.form.tenantSearch')}
                    style={formStyles.searchInput}
                  />
                  <View style={formStyles.options}>
                    {visibleTenantOptions.map((option) => (
                      <ChoiceCard
                        key={option.id}
                        option={option}
                        selected={option.id === tenantId}
                        onPress={() => handleTenantSelect(option.id)}
                      />
                    ))}
                  </View>
                  {visibleTenantOptions.length === 0 ? (
                    <Text style={formStyles.helper}>{t('agreements.form.tenantNoMatch')}</Text>
                  ) : null}
                </>
              ) : selectedTenant !== undefined ? (
                <>
                  <ChoiceCard
                    option={selectedTenant}
                    selected
                    onPress={() => setTenantPickerOpen(true)}
                  />
                  <SecondaryButton
                    title={t('agreements.form.changeTenant')}
                    onPress={() => setTenantPickerOpen(true)}
                  />
                </>
              ) : (
                <SelectionPrompt
                  icon={'👤'}
                  title={t('agreements.form.chooseTenant')}
                  hint={t('agreements.form.chooseTenantHint')}
                  onPress={() => setTenantPickerOpen(true)}
                />
              )}
              {fieldErrors.tenantId !== undefined ? (
                <Text style={formStyles.error}>{fieldErrors.tenantId}</Text>
              ) : null}
            </View>

            <View style={formStyles.section}>
              <SectionHeader
                title={t('agreements.form.whatSection')}
                hint={t('agreements.form.whatHint')}
              />

              <Text style={formStyles.subLabel}>{t('agreements.form.propertySection')}</Text>
              {propertyOptions.length === 0 ? (
                <View style={formStyles.emptyState}>
                  <Text style={formStyles.helper}>{t('agreements.form.propertyEmpty')}</Text>
                  {onAddProperty !== undefined ? (
                    <SecondaryButton
                      title={t('agreements.form.addProperty')}
                      onPress={onAddProperty}
                    />
                  ) : null}
                </View>
              ) : propertyPickerOpen ? (
                <View style={formStyles.options}>
                  {propertyOptions.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      option={option}
                      selected={option.id === propertyId}
                      onPress={() => handlePropertySelect(option.id)}
                    />
                  ))}
                </View>
              ) : selectedProperty !== undefined ? (
                <>
                  <ChoiceCard
                    option={selectedProperty}
                    selected
                    onPress={() => setPropertyPickerOpen(true)}
                  />
                  <SecondaryButton
                    title={t('agreements.form.changeProperty')}
                    onPress={() => setPropertyPickerOpen(true)}
                  />
                </>
              ) : (
                <SelectionPrompt
                  icon={'🏠'}
                  title={t('agreements.form.chooseProperty')}
                  onPress={() => setPropertyPickerOpen(true)}
                />
              )}
              {fieldErrors.propertyId !== undefined ? (
                <Text style={formStyles.error}>{fieldErrors.propertyId}</Text>
              ) : null}

              <Text style={[formStyles.subLabel, formStyles.subLabelSpaced]}>
                {t('agreements.form.spaceSection')}
              </Text>
              {propertyId.length === 0 ? (
                <Text style={formStyles.helper}>{t('agreements.form.choosePropertyFirst')}</Text>
              ) : spaceOptions.length === 0 ? (
                <View style={formStyles.emptyState}>
                  <Text style={formStyles.helper}>{t('agreements.form.spaceEmpty')}</Text>
                  {onManageSpaces !== undefined ? (
                    <SecondaryButton
                      title={t('agreements.form.manageSpaces')}
                      onPress={onManageSpaces}
                    />
                  ) : null}
                </View>
              ) : spacePickerOpen ? (
                <>
                  <View style={formStyles.options}>
                    {spaceOptions.map((option) => (
                      <ChoiceCard
                        key={option.id}
                        option={option}
                        selected={option.id === spaceId}
                        onPress={() => handleSpaceSelect(option.id)}
                      />
                    ))}
                  </View>
                  <Text style={formStyles.helper}>{t('agreements.form.spaceHelper')}</Text>
                </>
              ) : selectedSpace !== undefined ? (
                <>
                  <ChoiceCard
                    option={selectedSpace}
                    selected
                    onPress={() => setSpacePickerOpen(true)}
                  />
                  <SecondaryButton
                    title={t('agreements.form.changeSpace')}
                    onPress={() => setSpacePickerOpen(true)}
                  />
                </>
              ) : (
                <SelectionPrompt
                  icon={'🚪'}
                  title={t('agreements.form.chooseSpace')}
                  onPress={() => setSpacePickerOpen(true)}
                />
              )}
              {fieldErrors.spaceId !== undefined ? (
                <Text style={formStyles.error}>{fieldErrors.spaceId}</Text>
              ) : null}
            </View>

            <View style={formStyles.section}>
              <SectionHeader
                title={t('agreements.form.rentSection')}
                hint={t('agreements.form.rentHint')}
              />
              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.rentAmount')}</Text>
                <TextInput
                  value={rentAmount}
                  onChangeText={handleTextChange(setRentAmount)}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('agreements.form.rentAmount')}
                  style={[formStyles.input, fieldErrors.rentAmount ? formStyles.inputError : null]}
                />
                <Text style={formStyles.helper}>{t('agreements.form.rentAmountHelper')}</Text>
                {fieldErrors.rentAmount !== undefined ? (
                  <Text style={formStyles.error}>{fieldErrors.rentAmount}</Text>
                ) : null}
              </View>

              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.rentFrequency')}</Text>
                <View style={formStyles.frequencyList}>
                  {RENT_FREQUENCIES.map((frequency) => (
                    <FrequencyOption
                      key={frequency}
                      label={t(`agreements.form.frequency.${frequency}`)}
                      selected={frequency === rentFrequency}
                      onPress={() => {
                        setSubmitting(false);
                        setRentFrequency(frequency);
                      }}
                    />
                  ))}
                </View>
              </View>

              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.firstRentDueDate')}</Text>
                <TextInput
                  value={firstRentDueDate}
                  onChangeText={handleTextChange(setFirstRentDueDate)}
                  placeholder={t('agreements.form.datePlaceholder')}
                  autoCapitalize="none"
                  accessibilityLabel={t('agreements.form.firstRentDueDate')}
                  style={[
                    formStyles.input,
                    fieldErrors.firstRentDueDate ? formStyles.inputError : null,
                  ]}
                />
                <Text style={formStyles.helper}>{t('agreements.form.firstRentDueHelper')}</Text>
                {fieldErrors.firstRentDueDate !== undefined ? (
                  <Text style={formStyles.error}>{fieldErrors.firstRentDueDate}</Text>
                ) : null}
              </View>

              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.securityDeposit')}</Text>
                <TextInput
                  value={securityDeposit}
                  onChangeText={handleTextChange(setSecurityDeposit)}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('agreements.form.securityDeposit')}
                  style={[
                    formStyles.input,
                    fieldErrors.securityDeposit ? formStyles.inputError : null,
                  ]}
                />
                <Text style={formStyles.helper}>{t('agreements.form.depositHelper')}</Text>
                {fieldErrors.securityDeposit !== undefined ? (
                  <Text style={formStyles.error}>{fieldErrors.securityDeposit}</Text>
                ) : null}
              </View>
            </View>

            <View style={formStyles.section}>
              <SectionHeader
                title={t('agreements.form.datesSection')}
                hint={t('agreements.form.datesHint')}
              />
              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.startDate')}</Text>
                <TextInput
                  value={startDate}
                  onChangeText={handleTextChange(setStartDate)}
                  placeholder={t('agreements.form.datePlaceholder')}
                  autoCapitalize="none"
                  accessibilityLabel={t('agreements.form.startDate')}
                  style={[formStyles.input, fieldErrors.startDate ? formStyles.inputError : null]}
                />
                <Text style={formStyles.helper}>{t('agreements.form.startDateHelper')}</Text>
                {fieldErrors.startDate !== undefined ? (
                  <Text style={formStyles.error}>{fieldErrors.startDate}</Text>
                ) : null}
              </View>

              <View style={formStyles.field}>
                <Text style={formStyles.label}>{t('agreements.form.endDate')}</Text>
                <TextInput
                  value={endDate}
                  onChangeText={handleTextChange(setEndDate)}
                  placeholder={t('agreements.form.datePlaceholder')}
                  autoCapitalize="none"
                  accessibilityLabel={t('agreements.form.endDate')}
                  style={[formStyles.input, fieldErrors.endDate ? formStyles.inputError : null]}
                />
                <Text style={formStyles.helper}>{t('agreements.form.endDateHelper')}</Text>
                {fieldErrors.endDate !== undefined ? (
                  <Text style={formStyles.error}>{fieldErrors.endDate}</Text>
                ) : null}
              </View>
            </View>
          </>
        )}

        {locked ? null : (
          <View style={formStyles.field}>
            <Text style={formStyles.label}>{t('agreements.form.notes')}</Text>
            <TextInput
              value={notes}
              onChangeText={handleTextChange(setNotes)}
              multiline
              maxLength={RENTAL_AGREEMENT_NOTES_MAX_LENGTH}
              accessibilityLabel={t('agreements.form.notes')}
              style={[formStyles.input, formStyles.multiline]}
            />
            <Text style={formStyles.helper}>{t('agreements.form.notesHelper')}</Text>
          </View>
        )}

        <View style={formStyles.section}>
          <SectionHeader
            title={
              locked ? t('agreements.form.summaryTitle') : t('agreements.form.reviewTitle')
            }
            hint={locked ? undefined : t('agreements.form.reviewHint')}
          />
          <View style={formStyles.reviewList}>
            <ReviewRow label={t('agreements.form.reviewTenant')} value={tenantValue} />
            <ReviewRow label={t('agreements.form.reviewProperty')} value={propertyValue} />
            <ReviewRow label={t('agreements.form.reviewSpace')} value={spaceValue} />
            <ReviewRow label={t('agreements.form.reviewRent')} value={rentValue} />
            <ReviewRow label={t('agreements.form.reviewFirstRent')} value={firstRentValue} />
            <ReviewRow label={t('agreements.form.reviewStart')} value={startValue} />
            <ReviewRow label={t('agreements.form.reviewEnd')} value={endValue} />
            <ReviewRow label={t('agreements.form.reviewDeposit')} value={depositValue} />
          </View>
        </View>

        {locked ? (
          <View style={formStyles.field}>
            <Text style={formStyles.label}>{t('agreements.form.notes')}</Text>
            <TextInput
              value={notes}
              onChangeText={handleTextChange(setNotes)}
              multiline
              maxLength={RENTAL_AGREEMENT_NOTES_MAX_LENGTH}
              accessibilityLabel={t('agreements.form.notes')}
              style={[formStyles.input, formStyles.multiline]}
            />
            <Text style={formStyles.helper}>{t('agreements.form.notesHelper')}</Text>
          </View>
        ) : null}

        {error !== undefined ? <Text style={formStyles.error}>{error}</Text> : null}
        <PrimaryButton
          title={mode === 'create' ? t('agreements.form.saveCreate') : t('agreements.form.saveEdit')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <SecondaryButton title={t('common.cancel')} onPress={onCancel} />
      </Card>
    </KeyboardSafeContainer>
  );
}

const formStyles = StyleSheet.create({
  section: {
    gap: spacing.s,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  sectionHint: {
    fontSize: 15,
    color: palette.textMuted,
    lineHeight: 21,
  },
  subLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.xs,
  },
  subLabelSpaced: {
    marginTop: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  helper: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
  emptyState: {
    gap: spacing.s,
  },
  options: {
    gap: spacing.s,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderWidth: 2,
    borderColor: palette.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: spacing.m,
    paddingVertical: 16,
    minHeight: 64,
    backgroundColor: palette.surface,
  },
  promptPressed: {
    opacity: 0.8,
  },
  promptIcon: {
    fontSize: 24,
  },
  promptBody: {
    flex: 1,
    gap: 2,
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.primary,
  },
  promptHint: {
    fontSize: 14,
    color: palette.textMuted,
  },
  promptChevron: {
    fontSize: 28,
    color: palette.primary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: spacing.m,
    paddingVertical: 14,
    minHeight: 56,
    backgroundColor: palette.background,
  },
  optionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionText: {
    fontSize: 17,
    color: palette.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: palette.primary,
  },
  optionHint: {
    fontSize: 14,
    color: palette.textMuted,
  },
  optionCheck: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primary,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: 17,
    color: palette.text,
  },
  frequencyList: {
    gap: spacing.s,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: spacing.m,
    paddingVertical: 14,
    minHeight: 56,
    backgroundColor: palette.background,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: palette.text,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.m,
    paddingVertical: 14,
    fontSize: 18,
    color: palette.text,
  },
  inputError: {
    borderColor: palette.danger,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 15,
    color: palette.danger,
  },
  lockedNotice: {
    fontSize: 15,
    color: palette.textMuted,
    lineHeight: 21,
  },
  reviewList: {
    gap: spacing.s,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  reviewLabel: {
    flex: 1,
    fontSize: 16,
    color: palette.textMuted,
  },
  reviewValue: {
    flex: 2,
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    textAlign: 'right',
  },
});
