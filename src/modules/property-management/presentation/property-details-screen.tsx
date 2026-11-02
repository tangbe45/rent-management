import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import type { Property } from '../domain/property';
import { ArchiveBlockedByActiveRentalAgreementsError } from '../application/errors';
import {
  archiveProperty,
  getProperty,
  restoreProperty,
} from '../infrastructure/composition-root';
import { PropertyDetails } from './property-details';
import { PropertyMessage } from './property-ui';

export function PropertyDetailsScreen({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const [property, setProperty] = useState<Property | null>(() =>
    getProperty.execute({ id: propertyId }),
  );
  const [error, setError] = useState<string | undefined>();

  // Re-read the property from SQLite whenever the screen regains focus, so an
  // edit performed on the pushed form is reflected on return. Driven by the
  // navigation focus lifecycle rather than a render-time value, which may not
  // change while the covered screen is not re-rendered.
  const reload = useCallback(() => {
    setProperty(getProperty.execute({ id: propertyId }));
  }, [propertyId]);

  useFocusEffect(reload);

  if (property === null) {
    return (
      <PropertyMessage
        title={t('properties.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const handleArchive = () => {
    try {
      archiveProperty.execute({ id: property.id });
      setError(undefined);
      reload();
    } catch (caught) {
      setError(
        caught instanceof ArchiveBlockedByActiveRentalAgreementsError
          ? t('properties.error.archiveBlocked')
          : t('properties.error.generic'),
      );
    }
  };

  const handleRestore = () => {
    try {
      restoreProperty.execute({ id: property.id });
      setError(undefined);
      reload();
    } catch {
      setError(t('properties.error.generic'));
    }
  };

  return (
    <PropertyDetails
      property={property}
      error={error}
      onEdit={() => router.push(`/properties/${property.id}/edit`)}
      onArchive={handleArchive}
      onRestore={handleRestore}
      onBack={() => router.back()}
    />
  );
}
