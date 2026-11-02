import { Text } from 'react-native';

import { useTranslation } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import { Card, KeyboardSafeContainer, PrimaryButton, styles } from './setup-ui';

interface CompleteStepProps {
  trialEndDate?: string;
  onStartManaging: () => void;
}

export function CompleteStep({ trialEndDate, onStartManaging }: CompleteStepProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.subscription} ${t('setup.complete.title')}`}</Text>
      <Card>
        <Text style={styles.subtitle}>{t('setup.complete.trialStarts')}</Text>
        {trialEndDate ? (
          <Text style={styles.subtitle}>{t('setup.complete.trialEnds', { date: trialEndDate })}</Text>
        ) : null}
        <PrimaryButton title={t('setup.complete.start')} onPress={onStartManaging} />
      </Card>
    </KeyboardSafeContainer>
  );
}
