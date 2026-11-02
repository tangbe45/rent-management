import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  styles,
} from '../../account/presentation/setup/setup-ui';
import {
  isPlausibleTenantEmail,
  isPlausibleTenantPhone,
  TENANT_EMAIL_MAX_LENGTH,
  TENANT_NAME_MAX_LENGTH,
  TENANT_NATIONAL_ID_MAX_LENGTH,
  TENANT_NOTES_MAX_LENGTH,
  TENANT_PHONE_MAX_LENGTH,
} from '../domain/tenant';
import { SecondaryButton } from './tenant-ui';

export type TenantFormMode = 'create' | 'edit';

export interface TenantFormValues {
  fullName: string;
  phone: string;
  secondPhoneNumber: string;
  email: string;
  nationalIdCardNumber: string;
  notes: string;
}

interface TenantFormProps {
  mode: TenantFormMode;
  initialValues?: Partial<TenantFormValues>;
  error?: string;
  onSubmit: (values: TenantFormValues) => void;
  onCancel: () => void;
}

type FieldErrors = Partial<
  Record<'fullName' | 'phone' | 'secondPhoneNumber' | 'email', string>
>;

export function TenantForm({ mode, initialValues, error, onSubmit, onCancel }: TenantFormProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(initialValues?.fullName ?? '');
  const [phone, setPhone] = useState(initialValues?.phone ?? '');
  const [secondPhoneNumber, setSecondPhoneNumber] = useState(
    initialValues?.secondPhoneNumber ?? '',
  );
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [nationalIdCardNumber, setNationalIdCardNumber] = useState(
    initialValues?.nationalIdCardNumber ?? '',
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = () => {
    const nextErrors: FieldErrors = {};
    if (fullName.trim().length === 0) {
      nextErrors.fullName = t('tenants.validation.nameRequired');
    }
    if (phone.trim().length > 0 && !isPlausibleTenantPhone(phone)) {
      nextErrors.phone = t('tenants.validation.phoneInvalid');
    }
    if (secondPhoneNumber.trim().length > 0 && !isPlausibleTenantPhone(secondPhoneNumber)) {
      nextErrors.secondPhoneNumber = t('tenants.validation.phoneInvalid');
    }
    if (email.trim().length > 0 && !isPlausibleTenantEmail(email)) {
      nextErrors.email = t('tenants.validation.emailInvalid');
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSubmit({ fullName, phone, secondPhoneNumber, email, nationalIdCardNumber, notes });
  };

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.tenants} ${
          mode === 'create' ? t('tenants.create.title') : t('tenants.edit.title')
        }`}
      </Text>
      <Card>
        <View style={styles.field}>
          <View style={formStyles.labelRow}>
            <Text style={styles.fieldLabel}>{t('tenants.form.fullName')}</Text>
            <Text style={formStyles.required}>{t('tenants.form.required')}</Text>
          </View>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            maxLength={TENANT_NAME_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.fullName')}
            style={[styles.input, fieldErrors.fullName ? styles.inputError : null]}
          />
          {fieldErrors.fullName ? (
            <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('tenants.form.phone')}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={TENANT_PHONE_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.phone')}
            style={[styles.input, fieldErrors.phone ? styles.inputError : null]}
          />
          {fieldErrors.phone ? <Text style={styles.fieldError}>{fieldErrors.phone}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('tenants.form.secondPhoneNumber')}</Text>
          <TextInput
            value={secondPhoneNumber}
            onChangeText={setSecondPhoneNumber}
            keyboardType="phone-pad"
            maxLength={TENANT_PHONE_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.secondPhoneNumber')}
            style={[styles.input, fieldErrors.secondPhoneNumber ? styles.inputError : null]}
          />
          {fieldErrors.secondPhoneNumber ? (
            <Text style={styles.fieldError}>{fieldErrors.secondPhoneNumber}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('tenants.form.email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={TENANT_EMAIL_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.email')}
            style={[styles.input, fieldErrors.email ? styles.inputError : null]}
          />
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('tenants.form.nationalId')}</Text>
          <TextInput
            value={nationalIdCardNumber}
            onChangeText={setNationalIdCardNumber}
            maxLength={TENANT_NATIONAL_ID_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.nationalId')}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('tenants.form.notes')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={TENANT_NOTES_MAX_LENGTH}
            accessibilityLabel={t('tenants.form.notes')}
            style={[styles.input, formStyles.multiline]}
          />
        </View>

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton
          title={
            mode === 'create' ? t('tenants.form.saveCreate') : t('tenants.form.saveEdit')
          }
          onPress={handleSubmit}
        />
        <SecondaryButton title={t('common.cancel')} onPress={onCancel} />
      </Card>
    </KeyboardSafeContainer>
  );
}

const formStyles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  required: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
