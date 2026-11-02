import { useState } from 'react';
import { Text } from 'react-native';

import { useTranslation } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import { Card, Field, KeyboardSafeContainer, PrimaryButton, styles } from './setup-ui';

interface AccountStepProps {
  onSubmit: (fullName: string) => void;
}

export function AccountStep({ onSubmit }: AccountStepProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleContinue = () => {
    const trimmed = fullName.trim();
    if (trimmed.length === 0) {
      setError(t('setup.validation.nameRequired'));
      return;
    }
    setError(undefined);
    onSubmit(trimmed);
  };

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.account} ${t('setup.account.title')}`}</Text>
      <Card>
        <Field
          label={t('setup.account.nameLabel')}
          placeholder={t('setup.account.namePlaceholder')}
          autoFocus
          error={error}
          onSubmitEditing={handleContinue}
          onChangeText={setFullName}
        />
        <PrimaryButton title={t('setup.account.continue')} onPress={handleContinue} />
      </Card>
    </KeyboardSafeContainer>
  );
}
