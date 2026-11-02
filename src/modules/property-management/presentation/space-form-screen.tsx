import { router } from 'expo-router';
import { useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import {
  createPropertySpace,
  getProperty,
  getPropertySpace,
  listPropertySpaces,
  movePropertySpace,
  updatePropertySpace,
} from '../infrastructure/composition-root';
import { PropertyMessage } from './property-ui';
import { spaceErrorMessage } from './space-error-message';
import {
  SpaceForm,
  type SpaceFormMode,
  type SpaceFormValues,
  type SpaceParentOption,
} from './space-form';
import { collectDescendantIds, flattenSpaceTree } from './space-tree';
import { requestExpandOnNextWorkspaceFocus } from './workspace-expansion';

interface SpaceFormScreenProps {
  mode: SpaceFormMode;
  propertyId: string;
  spaceId?: string;
  initialParentId?: string | null;
}

export function SpaceFormScreen({
  mode,
  propertyId,
  spaceId,
  initialParentId,
}: SpaceFormScreenProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | undefined>();

  const existing =
    mode === 'edit' && spaceId !== undefined ? getPropertySpace.execute({ id: spaceId }) : null;

  if (mode === 'edit' && existing === null) {
    return (
      <PropertyMessage
        title={t('spaces.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const allSpaces = listPropertySpaces.execute({ propertyId });
  const propertyName = getProperty.execute({ id: propertyId })?.name;
  const excluded =
    existing !== null
      ? new Set<string>([existing.id, ...collectDescendantIds(existing.id, allSpaces)])
      : new Set<string>();
  const parentOptions: SpaceParentOption[] = flattenSpaceTree(allSpaces)
    .filter(({ space }) => space.isActive && !excluded.has(space.id))
    .map(({ space, depth }) => ({
      id: space.id,
      name: space.name,
      type: space.type,
      depth,
    }));

  const handleSubmit = (values: SpaceFormValues) => {
    try {
      if (mode === 'create') {
        createPropertySpace.execute({
          propertyId,
          parentSpaceId: values.parentSpaceId,
          name: values.name,
          type: values.type,
          rentable: values.rentable,
        });
        if (values.parentSpaceId !== null) {
          requestExpandOnNextWorkspaceFocus(propertyId, values.parentSpaceId);
        }
      } else if (existing !== null) {
        if (existing.parentSpaceId !== values.parentSpaceId) {
          movePropertySpace.execute({ id: existing.id, parentSpaceId: values.parentSpaceId });
        }
        updatePropertySpace.execute({
          id: existing.id,
          name: values.name,
          type: values.type,
          rentable: values.rentable,
        });
      }
      router.back();
    } catch (caught) {
      setError(spaceErrorMessage(t, caught));
    }
  };

  return (
    <SpaceForm
      key={existing?.id ?? `create:${initialParentId ?? ''}`}
      mode={mode}
      propertyName={propertyName}
      initialValues={
        existing !== null
          ? {
              name: existing.name,
              type: existing.type,
              parentSpaceId: existing.parentSpaceId,
              rentable: existing.rentable,
            }
          : { parentSpaceId: initialParentId ?? null }
      }
      parentOptions={parentOptions}
      error={error}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}