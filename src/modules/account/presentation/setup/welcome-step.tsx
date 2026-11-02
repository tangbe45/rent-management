import { Text, View } from 'react-native';

import { useTranslation } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import { Card, KeyboardSafeContainer, PrimaryButton, styles } from './setup-ui';

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>{`${conceptEmoji.welcome} ${t('setup.welcome.title')}`}</Text>
        <Text style={styles.subtitle}>{t('setup.welcome.tagline')}</Text>
      </View>
      <Card>
        <Text style={styles.subtitle}>{t('setup.welcome.trial')}</Text>
        <PrimaryButton title={t('setup.welcome.start')} onPress={onContinue} />
      </Card>
    </KeyboardSafeContainer>
  );
}
