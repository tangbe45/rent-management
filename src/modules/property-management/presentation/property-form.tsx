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
  PROPERTY_ADDRESS_MAX_LENGTH,
  PROPERTY_NAME_MAX_LENGTH,
} from '../domain/property';

export type PropertyFormMode = 'create' | 'edit';

export interface PropertyFormValues {
  name: string;
  address: string;
  description: string;
}

interface PropertyFormProps {
  mode: PropertyFormMode;
  initialValues?: Partial<PropertyFormValues>;
  error?: string;
  onSubmit: (values: PropertyFormValues) => void;
}

export function PropertyForm({ mode, initialValues, error, onSubmit }: PropertyFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; address?: string }>({});

  const handleSubmit = () => {
    const nextErrors: { name?: string; address?: string } = {};
    if (name.trim().length === 0) {
      nextErrors.name = t('properties.validation.nameRequired');
    }
    if (address.trim().length === 0) {
      nextErrors.address = t('properties.validation.addressRequired');
    }
    setFieldErrors(nextErrors);
    if (nextErrors.name !== undefined || nextErrors.address !== undefined) {
      return;
    }
    onSubmit({ name, address, description });
  };

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.properties} ${
          mode === 'create' ? t('properties.create.title') : t('properties.edit.title')
        }`}
      </Text>
      <Card>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('properties.form.name')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={PROPERTY_NAME_MAX_LENGTH}
            accessibilityLabel={t('properties.form.name')}
            style={[styles.input, fieldErrors.name ? styles.inputError : null]}
          />
          {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('properties.form.address')}</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            maxLength={PROPERTY_ADDRESS_MAX_LENGTH}
            accessibilityLabel={t('properties.form.address')}
            style={[styles.input, fieldErrors.address ? styles.inputError : null]}
          />
          {fieldErrors.address ? (
            <Text style={styles.fieldError}>{fieldErrors.address}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('properties.form.description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel={t('properties.form.description')}
            style={[styles.input, formStyles.multiline]}
          />
        </View>

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton title={t('common.save')} onPress={handleSubmit} />
      </Card>
    </KeyboardSafeContainer>
  );
}

const formStyles = StyleSheet.create({
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});