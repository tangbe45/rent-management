import { useState } from 'react';
import { Text } from 'react-native';

import { useTranslation } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import { Card, Field, KeyboardSafeContainer, PrimaryButton, styles } from './setup-ui';

const PIN_PATTERN = /^\d{4}$/;

interface PinStepProps {
  submitting: boolean;
  error: string | undefined;
  onSubmit: (pin: string) => void;
}

export function PinStep({ submitting, error, onSubmit }: PinStepProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();

  const handleContinue = () => {
    setLocalError(undefined);
    if (!PIN_PATTERN.test(pin)) {
      setLocalError(t('setup.validation.pinLength'));
      return;
    }
    if (pin !== confirmPin) {
      setLocalError(t('setup.validation.pinMismatch'));
      return;
    }
    onSubmit(pin);
  };

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.security} ${t('setup.pin.title')}`}</Text>
      <Text style={styles.subtitle}>{t('setup.pin.subtitle')}</Text>
      <Card>
        <Field
          label={t('setup.pin.enterLabel')}
          secureTextEntry
          keyboardType="number-pad"
          onChangeText={setPin}
        />
        <Field
          label={t('setup.pin.confirmLabel')}
          secureTextEntry
          keyboardType="number-pad"
          onSubmitEditing={handleContinue}
          onChangeText={setConfirmPin}
        />
        {error ?? localError ? <Text style={styles.fieldError}>{error ?? localError}</Text> : null}
        <PrimaryButton
          title={t('setup.pin.continue')}
          onPress={handleContinue}
          loading={submitting}
        />
      </Card>
    </KeyboardSafeContainer>
  );
}
