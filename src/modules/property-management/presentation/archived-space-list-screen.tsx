import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import type { Property } from '../domain/property';
import type { PropertySpace } from '../domain/property-space';
import {
  getProperty,
  listPropertySpaces,
  restorePropertySpace,
} from '../infrastructure/composition-root';
import { ArchivedSpaceList } from './archived-space-list';
import { confirmLifecycleAction } from './confirmation';
import { PropertyMessage } from './property-ui';
import { spaceErrorMessage } from './space-error-message';

function listArchivedSpaces(propertyId: string): readonly PropertySpace[] {
  return listPropertySpaces.execute({ propertyId }).filter((space) => space.isArchived);
}

export function ArchivedSpaceListScreen({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const [property, setProperty] = useState<Property | null>(() =>
    getProperty.execute({ id: propertyId }),
  );
  const [spaces, setSpaces] = useState<readonly PropertySpace[]>(() =>
    listArchivedSpaces(propertyId),
  );
  const [error, setError] = useState<string | undefined>();

  // Reload on focus so a space archived from the workspace appears here at once,
  // and a space restored here is gone on return.
  const reload = useCallback(() => {
    setProperty(getProperty.execute({ id: propertyId }));
    setSpaces(listArchivedSpaces(propertyId));
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

  const handleRestore = (spaceId: string) => {
    confirmLifecycleAction(
      {
        title: t('spaces.confirm.restore.title'),
        message: t('spaces.confirm.restore.body'),
        confirmLabel: t('spaces.action.restore'),
        cancelLabel: t('common.cancel'),
      },
      () => {
        try {
          restorePropertySpace.execute({ id: spaceId });
          setError(undefined);
          reload();
        } catch (caught) {
          setError(spaceErrorMessage(t, caught));
        }
      },
    );
  };

  return (
    <ArchivedSpaceList
      propertyName={property.name}
      spaces={spaces}
      error={error}
      onOpen={(spaceId) => router.push(`/properties/${propertyId}/spaces/${spaceId}`)}
      onRestore={handleRestore}
      onBack={() => router.back()}
    />
  );
}
