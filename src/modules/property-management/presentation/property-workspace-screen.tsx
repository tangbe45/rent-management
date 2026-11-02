import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import { ArchiveBlockedByActiveRentalAgreementsError } from '../application/errors';
import type { PropertyWorkspaceOverview } from '../application/get-property-workspace-overview';
import type { Property } from '../domain/property';
import {
  archiveProperty,
  archivePropertySpace,
  getProperty,
  getPropertyWorkspaceOverview,
  restoreProperty,
} from '../infrastructure/composition-root';
import { confirmLifecycleAction } from './confirmation';
import { PropertyMessage } from './property-ui';
import { PropertyWorkspace } from './property-workspace';
import { spaceErrorMessage } from './space-error-message';
import { consumePendingExpansions } from './workspace-expansion';

export function PropertyWorkspaceScreen({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const [property, setProperty] = useState<Property | null>(() =>
    getProperty.execute({ id: propertyId }),
  );
  const [overview, setOverview] = useState<PropertyWorkspaceOverview>(() =>
    getPropertyWorkspaceOverview.execute({ propertyId }),
  );
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | undefined>();

  // Reload from SQLite and apply any pending expansion hint every time the
  // screen regains focus. Driven by navigation events, so it fires even while
  // the workspace stayed mounted beneath a create/edit form.
  const reload = useCallback(() => {
    setProperty(getProperty.execute({ id: propertyId }));
    setOverview(getPropertyWorkspaceOverview.execute({ propertyId }));
    const pending = consumePendingExpansions(propertyId);
    if (pending.length > 0) {
      setExpandedSpaceIds((current) => new Set([...current, ...pending]));
    }
  }, [propertyId]);

  useFocusEffect(reload);

  const confirm = (
    options: { title: string; message: string; confirmLabel: string; destructive?: boolean },
    action: () => void,
  ) =>
    confirmLifecycleAction(
      { ...options, cancelLabel: t('common.cancel') },
      action,
    );

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
    confirm(
      {
        title: t('properties.confirm.archive.title'),
        message: t('properties.confirm.archive.body'),
        confirmLabel: t('properties.action.archive'),
        destructive: true,
      },
      () => {
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
      },
    );
  };

  const handleRestoreProperty = () => {
    confirm(
      {
        title: t('properties.confirm.restore.title'),
        message: t('properties.confirm.restore.body'),
        confirmLabel: t('properties.action.restore'),
      },
      () => {
        try {
          restoreProperty.execute({ id: property.id });
          setError(undefined);
          reload();
        } catch {
          setError(t('properties.error.generic'));
        }
      },
    );
  };

  const handleArchiveSpace = (spaceId: string) => {
    const hasChildren = overview.spaces.some((space) => space.parentSpaceId === spaceId);
    confirm(
      {
        title: t('spaces.confirm.archive.title'),
        message: hasChildren
          ? t('spaces.confirm.archive.body')
          : t('spaces.confirm.archive.bodyLeaf'),
        confirmLabel: t('spaces.action.archive'),
        destructive: true,
      },
      () => {
        try {
          archivePropertySpace.execute({ id: spaceId });
          setError(undefined);
          reload();
        } catch (caught) {
          setError(spaceErrorMessage(t, caught));
        }
      },
    );
  };

  return (
    <PropertyWorkspace
      property={property}
      spaces={overview.spaces}
      availability={overview.availability}
      summary={overview.summary}
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
