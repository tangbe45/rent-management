import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { isValidCalendarDate } from '../../../shared/domain/calendar-date';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { useTranslation } from '../../../shared/i18n';
import {
  getProperty,
  getPropertySpace,
} from '../../property-management/infrastructure/composition-root';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import type { RentalAgreement } from '../domain/rental-agreement';
import {
  getRentalAgreement,
  getRentSchedule,
  terminateRentalAgreement,
} from '../infrastructure/composition-root';
import { agreementErrorKey } from './agreement-error-message';
import { AgreementDetails } from './agreement-details';
import { AgreementMessage } from './agreement-ui';

interface AgreementDetailsScreenProps {
  agreementId: string;
}

export function AgreementDetailsScreen({ agreementId }: AgreementDetailsScreenProps) {
  const { t } = useTranslation();
  const [clock] = useState(() => new SystemClock());
  const [agreement, setAgreement] = useState<RentalAgreement | null>(() =>
    getRentalAgreement.execute(agreementId),
  );
  const [error, setError] = useState<string | undefined>();
  const [terminating, setTerminating] = useState(false);
  const [terminationDate, setTerminationDate] = useState('');
  const [terminationError, setTerminationError] = useState<string | undefined>();

  const reload = useCallback(() => {
    setAgreement(getRentalAgreement.execute(agreementId));
  }, [agreementId]);

  useFocusEffect(reload);

  if (agreement === null) {
    return (
      <AgreementMessage
        title={t('agreements.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const tenant = getTenant.execute({ id: agreement.tenantId });
  const space = getPropertySpace.execute({ id: agreement.spaceId });
  const property = space === null ? null : getProperty.execute({ id: space.propertyId });
  const schedule = getRentSchedule.execute(agreement.id);

  const handleStartTermination = () => {
    setTerminating(true);
    setTerminationError(undefined);
    setError(undefined);
    setTerminationDate(clock.today());
  };

  const handleConfirmTermination = () => {
    const value = terminationDate.trim();
    if (value.length === 0) {
      setTerminationError(t('agreements.terminate.dateRequired'));
      return;
    }
    if (!isValidCalendarDate(value)) {
      setTerminationError(t('agreements.terminate.dateInvalid'));
      return;
    }
    try {
      terminateRentalAgreement.execute({ id: agreement.id, terminationDate: value });
      setTerminating(false);
      setTerminationError(undefined);
      setError(undefined);
      reload();
    } catch (caught) {
      setTerminationError(t(agreementErrorKey(caught)));
    }
  };

  return (
    <AgreementDetails
      agreement={agreement}
      lifecycle={agreement.lifecycleOn(clock.today())}
      tenantName={tenant?.fullName ?? null}
      propertyName={property?.name ?? null}
      spaceName={space?.name ?? null}
      dueDates={schedule.dueDates}
      nextDueDate={schedule.nextDueDate}
      error={error}
      terminating={terminating}
      terminationDate={terminationDate}
      terminationError={terminationError}
      onTerminationDateChange={setTerminationDate}
      onStartTermination={handleStartTermination}
      onCancelTermination={() => {
        setTerminating(false);
        setTerminationError(undefined);
      }}
      onConfirmTermination={handleConfirmTermination}
      onOpenRent={() => router.push(`/rent/agreements/${agreement.id}`)}
      onEdit={() => router.push(`/agreements/${agreement.id}/edit`)}
      onBack={() => router.back()}
    />
  );
}
