import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import { ArchiveBlockedByActiveRentalAgreementsError } from '../application/errors';
import type { Property } from '../domain/property';
import type { PropertySpace } from '../domain/property-space';
import {
  archiveProperty,
  archivePropertySpace,
  getProperty,
  listPropertySpaces,
  restoreProperty,
} from '../infrastructure/composition-root';
import { PropertyMessage } from './property-ui';
import { PropertyWorkspace } from './property-workspace';
import { spaceErrorMessage } from './space-error-message';
import { consumePendingExpansions } from './workspace-expansion';

export function PropertyWorkspaceScreen({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const [property, setProperty] = useState<Property | null>(() =>
    getProperty.execute({ id: propertyId }),
  );
  const [spaces, setSpaces] = useState<readonly PropertySpace[]>(() =>
    listPropertySpaces.execute({ propertyId }),
  );
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | undefined>();

  // Reload from SQLite and apply any pending expansion hint every time the
  // screen regains focus. Driven by navigation events, so it fires even while
  // the workspace stayed mounted beneath a create/edit form.
  const reload = useCallback(() => {
    setProperty(getProperty.execute({ id: propertyId }));
    setSpaces(listPropertySpaces.execute({ propertyId }));
    const pending = consumePendingExpansions(propertyId);
    if (pending.length > 0) {
      setExpandedSpaceIds((current) => new Set([...current, ...pending]));
    }
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

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaceIds((current) => {
      const next = new Set(current);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  const handleArchiveProperty = () => {
    try {
      archiveProperty.execute({ id: property.id });
      setError(undefined);
      router.back();
    } catch (caught) {
      setError(
        caught instanceof ArchiveBlockedByActiveRentalAgreementsError
          ? t('properties.error.archiveBlocked')
          : t('properties.error.generic'),
      );
    }
  };

  const handleRestoreProperty = () => {
    try {
      restoreProperty.execute({ id: property.id });
      setError(undefined);
      reload();
    } catch {
      setError(t('properties.error.generic'));
    }
  };

  const handleArchiveSpace = (spaceId: string) => {
    try {
      archivePropertySpace.execute({ id: spaceId });
      setError(undefined);
      reload();
    } catch (caught) {
      setError(spaceErrorMessage(t, caught));
    }
  };

  return (
    <PropertyWorkspace
      property={property}
      spaces={spaces}
      expandedSpaceIds={expandedSpaceIds}
      error={error}
      onToggleSpace={toggleSpace}
      onOpenSpace={(spaceId) => router.push(`/properties/${propertyId}/spaces/${spaceId}`)}
      onAddChildSpace={(spaceId) =>
        router.push(`/properties/${propertyId}/spaces/new?parentSpaceId=${spaceId}`)
      }
      onEditSpace={(spaceId) => router.push(`/properties/${propertyId}/spaces/${spaceId}/edit`)}
      onArchiveSpace={handleArchiveSpace}
      onAddSpace={() => router.push(`/properties/${propertyId}/spaces/new`)}
      onOpenArchivedSpaces={() => router.push(`/properties/${propertyId}/spaces`)}
      onOpenDetails={() => router.push(`/properties/${propertyId}/details`)}
      onEditProperty={() => router.push(`/properties/${propertyId}/edit`)}
      onArchiveProperty={handleArchiveProperty}
      onRestoreProperty={handleRestoreProperty}
    />
  );
}
