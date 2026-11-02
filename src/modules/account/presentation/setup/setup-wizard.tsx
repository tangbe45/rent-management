import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../../../../shared/i18n';
import { initializeApplication } from '../../infrastructure/composition-root';
import { ApplicationAlreadyInitializedError } from '../../application/errors';
import { InvalidAccountNameError } from '../../domain/account';
import { InvalidPinError } from '../../domain/pin';
import { AccountStep } from './account-step';
import { CompleteStep } from './complete-step';
import { PinStep } from './pin-step';
import { styles } from './setup-ui';
import { WelcomeStep } from './welcome-step';

type Step = 'welcome' | 'account' | 'pin' | 'complete';

function friendlyMessage(error: unknown): string {
  if (error instanceof ApplicationAlreadyInitializedError) {
    return t('setup.error.alreadyInitialized');
  }
  if (error instanceof InvalidAccountNameError) {
    return t('setup.validation.nameInvalid');
  }
  if (error instanceof InvalidPinError) {
    return t('setup.validation.pinLength');
  }
  return t('common.error.generic');
}

export function SetupWizard() {
  const [step, setStep] = useState<Step>('welcome');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [trialEndDate, setTrialEndDate] = useState<string | undefined>();

  const handlePinSubmit = async (pin: string) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await initializeApplication.execute({ fullName, pin });
      setTrialEndDate(result.subscription.endDate);
      setStep('complete');
    } catch (cause) {
      setError(friendlyMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {step === 'welcome' ? (
        <WelcomeStep onContinue={() => setStep('account')} />
      ) : step === 'account' ? (
        <AccountStep
          onSubmit={(name) => {
            setFullName(name);
            setStep('pin');
          }}
        />
      ) : step === 'pin' ? (
        <PinStep submitting={submitting} error={error} onSubmit={handlePinSubmit} />
      ) : (
        <CompleteStep
          trialEndDate={trialEndDate}
          onStartManaging={() => router.replace('/unlock')}
        />
      )}
    </SafeAreaView>
  );
}