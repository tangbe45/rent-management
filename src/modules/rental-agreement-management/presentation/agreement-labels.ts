import type { TranslationKey } from '../../../shared/i18n';
import type { RentFrequency, RentalAgreementLifecycle } from '../domain/rental-agreement';

export function rentFrequencyLabelKey(frequency: RentFrequency): TranslationKey {
  return `agreements.frequency.${frequency}`;
}

export function lifecycleLabelKey(lifecycle: RentalAgreementLifecycle): TranslationKey {
  return `agreements.lifecycle.${lifecycle}`;
}

export const lifecycleEmoji: Record<RentalAgreementLifecycle, string> = {
  UPCOMING: '⏳',
  ACTIVE: '🟢',
  ENDED: '⚪',
  TERMINATED: '⛔',
};
