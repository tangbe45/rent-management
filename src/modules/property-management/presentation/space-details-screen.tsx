import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import type { PropertySpace } from '../domain/property-space';
import {
  archivePropertySpace,
  getPropertySpace,
  listPropertySpaces,
  restorePropertySpace,
} from '../infrastructure/composition-root';
import { confirmLifecycleAction } from './confirmation';
import { PropertyMessage } from './property-ui';
import { SpaceDetails } from './space-details';
import { spaceErrorMessage } from './space-error-message';

export function SpaceDetailsScreen({
  propertyId,
  spaceId,
}: {
  propertyId: string;
  spaceId: string;
}) {
  const { t } = useTranslation();
  const [space, setSpace] = useState<PropertySpace | null>(() =>
    getPropertySpace.execute({ id: spaceId }),
  );
  const [error, setError] = useState<string | undefined>();

  // Re-read the space whenever the screen regains focus, so an edit or move
  // performed on the pushed form is reflected on return. Driven by the
  // navigation focus lifecycle rather than a render-time value, which may not
  // change while the covered screen is not re-rendered.
  const reload = useCallback(() => {
    setSpace(getPropertySpace.execute({ id: spaceId }));
  }, [spaceId]);

  useFocusEffect(reload);

  if (space === null) {
    return (
      <PropertyMessage
        title={t('spaces.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const allSpaces = listPropertySpaces.execute({ propertyId });
  const parent =
    space.parentSpaceId !== null
      ? (allSpaces.find((candidate) => candidate.id === space.parentSpaceId) ?? null)
      : null;
  const childrenNames = allSpaces
    .filter((candidate) => candidate.parentSpaceId === space.id)
    .map((candidate) => candidate.name);

  const handleArchive = () => {
    try {
      archivePropertySpace.execute({ id: space.id });
      setError(undefined);
      reload();
    } catch (caught) {
      setError(spaceErrorMessage(t, caught));
    }
  };

  const handleRestore = () => {
    try {
      restorePropertySpace.execute({ id: space.id });
      setError(undefined);
      reload();
    } catch (caught) {
      setError(spaceErrorMessage(t, caught));
    }
  };

  const confirmArchive = () =>
    confirmLifecycleAction(
      {
        title: t('spaces.confirm.archive.title'),
        message:
          childrenNames.length > 0
            ? t('spaces.confirm.archive.body')
            : t('spaces.confirm.archive.bodyLeaf'),
        confirmLabel: t('spaces.action.archive'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      },
      handleArchive,
    );

  const confirmRestore = () =>
    confirmLifecycleAction(
      {
        title: t('spaces.confirm.restore.title'),
        message: t('spaces.confirm.restore.body'),
        confirmLabel: t('spaces.action.restore'),
        cancelLabel: t('common.cancel'),
      },
      handleRestore,
    );

  return (
    <SpaceDetails
      space={space}
      parentName={parent?.name ?? null}
      childrenNames={childrenNames}
      error={error}
      onEdit={() => router.push(`/properties/${propertyId}/spaces/${space.id}/edit`)}
      onAddChild={() => router.push(`/properties/${propertyId}/spaces/new?parentSpaceId=${space.id}`)}
      onCreateAgreement={() =>
        router.push(`/agreements/new?propertyId=${propertyId}&spaceId=${space.id}`)
      }
      onArchive={confirmArchive}
      onRestore={confirmRestore}
      onBack={() => router.back()}
    />
  );
}
