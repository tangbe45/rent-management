import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import { PIN_LENGTH } from '../../domain/pin';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  palette,
  spacing,
  styles,
} from '../setup/setup-ui';

interface UnlockFormProps {
  firstName?: string;
  onSubmit: (pin: string) => Promise<boolean>;
}

export function UnlockForm({ firstName, onSubmit }: UnlockFormProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleChangeText = (next: string) => {
    setPin(next.replace(/\D/g, '').slice(0, PIN_LENGTH));
  };

  const handleUnlock = async () => {
    if (pin.length !== PIN_LENGTH) {
      setErrorMessage(t('unlock.error.empty'));
      return;
    }
    setErrorMessage(undefined);
    setSubmitting(true);
    try {
      const authenticated = await onSubmit(pin);
      if (!authenticated) {
        setPin('');
        setErrorMessage(t('unlock.error.incorrect'));
      }
    } catch {
      setPin('');
      setErrorMessage(t('common.error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardSafeContainer>
      <View style={unlockStyles.header}>
        <Text style={styles.title}>{`${conceptEmoji.security} ${t('unlock.title')}`}</Text>
        {firstName ? <Text style={unlockStyles.name}>{firstName}</Text> : null}
      </View>
      <Card>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('unlock.pinLabel')}</Text>
          <TextInput
            value={pin}
            onChangeText={handleChangeText}
            placeholder="• • • •"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            accessibilityLabel={t('unlock.pinLabel')}
            style={[styles.input, unlockStyles.pinInput, errorMessage ? styles.inputError : null]}
          />
        </View>
        {errorMessage ? <Text style={styles.fieldError}>{errorMessage}</Text> : null}
        <PrimaryButton title={t('unlock.action')} onPress={handleUnlock} loading={submitting} />
      </Card>
    </KeyboardSafeContainer>
  );
}

const unlockStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  pinInput: {
    minHeight: 56,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
});
