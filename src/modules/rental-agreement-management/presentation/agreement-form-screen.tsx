import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { minorToEditable } from '../../../shared/presentation/money';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import type { PropertySpace } from '../../property-management/domain/property-space';
import {
  getPropertySpace,
  listProperties,
  listPropertySpaces,
} from '../../property-management/infrastructure/composition-root';
import { spaceTypeEmoji, spaceTypeLabelKey } from '../../property-management/presentation/space-emoji';
import { flattenSpaceTree } from '../../property-management/presentation/space-tree';
import { listTenants } from '../../tenant-management/infrastructure/composition-root';
import {
  createRentalAgreement,
  getRentalAgreement,
  updateRentalAgreement,
} from '../infrastructure/composition-root';
import { agreementErrorKey } from './agreement-error-message';
import {
  AgreementForm,
  type AgreementFormInitialValues,
  type AgreementFormOption,
  type AgreementFormValues,
} from './agreement-form';
import { AgreementMessage } from './agreement-ui';

interface AgreementFormScreenProps {
  mode: 'create' | 'edit';
  agreementId?: string;
  prefill?: { tenantId?: string; propertyId?: string; spaceId?: string };
}

function hasActiveAncestors(space: PropertySpace, byId: Map<string, PropertySpace>): boolean {
  const visited = new Set<string>([space.id]);
  let parentSpaceId = space.parentSpaceId;
  while (parentSpaceId !== null) {
    if (visited.has(parentSpaceId)) {
      return false;
    }
    visited.add(parentSpaceId);
    const parent = byId.get(parentSpaceId);
    if (parent === undefined || !parent.isActive) {
      return false;
    }
    parentSpaceId = parent.parentSpaceId;
  }
  return true;
}

/**
 * Builds the selectable spaces for a property: active, rentable spaces whose
 * whole ancestry is active, in depth-first order so the list reads as a tree.
 */
function buildSpaceOptions(
  propertyId: string,
  t: (key: TranslationKey) => string,
): AgreementFormOption[] {
  if (propertyId.length === 0) {
    return [];
  }
  const spaces = listPropertySpaces.execute({ propertyId });
  const byId = new Map(spaces.map((space) => [space.id, space]));
  return flattenSpaceTree(spaces)
    .filter(({ space }) => space.isActive && space.rentable && hasActiveAncestors(space, byId))
    .map(({ space, depth }) => {
      const typeLabel = `${spaceTypeEmoji(space.type)} ${t(spaceTypeLabelKey(space.type))}`;
      const path = spacePath(space, byId);
      return {
        id: space.id,
        label: space.name,
        hint: path === undefined ? typeLabel : `${typeLabel} · ${path}`,
        depth,
      };
    });
}

function spacePath(space: PropertySpace, byId: Map<string, PropertySpace>): string | undefined {
  const names: string[] = [];
  const visited = new Set<string>([space.id]);
  let parentSpaceId = space.parentSpaceId;
  while (parentSpaceId !== null && !visited.has(parentSpaceId)) {
    visited.add(parentSpaceId);
    const parent = byId.get(parentSpaceId);
    if (parent === undefined) {
      break;
    }
    names.unshift(parent.name);
    parentSpaceId = parent.parentSpaceId;
  }
  return names.length === 0 ? undefined : names.join(' › ');
}

export function AgreementFormScreen({ mode, agreementId, prefill }: AgreementFormScreenProps) {
  const { t } = useTranslation();
  const [clock] = useState(() => new SystemClock());
  const [error, setError] = useState<string | undefined>();

  const existing =
    mode === 'edit' && agreementId !== undefined ? getRentalAgreement.execute(agreementId) : null;
  const existingSpace = existing === null ? null : getPropertySpace.execute({ id: existing.spaceId });

  const [propertyId, setPropertyId] = useState(
    existingSpace?.propertyId ?? prefill?.propertyId ?? '',
  );
  const spaceOptions = useMemo(() => buildSpaceOptions(propertyId, t), [propertyId, t]);

  if (mode === 'edit' && existing === null) {
    return (
      <AgreementMessage
        title={t('agreements.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const tenantOptions: AgreementFormOption[] = listTenants
    .execute({ limit: 500 })
    .tenants.map((tenant) => ({
      id: tenant.id,
      label: tenant.fullName,
      hint: tenant.phone ?? undefined,
    }));
  const propertyOptions: AgreementFormOption[] = listProperties
    .execute()
    .map((property) => ({
      id: property.id,
      label: property.name,
      hint: property.address.trim().length === 0 ? undefined : property.address,
    }));

  const locked = existing !== null && existing.hasStartedOn(clock.today());

  const initialValues: AgreementFormInitialValues =
    existing === null
      ? {
          tenantId: prefill?.tenantId ?? '',
          propertyId: prefill?.propertyId ?? '',
          spaceId: prefill?.spaceId ?? '',
          startDate: '',
          endDate: '',
          firstRentDueDate: '',
          rentAmount: '',
          rentFrequency: 'MONTHLY',
          securityDeposit: '',
          notes: '',
        }
      : {
          tenantId: existing.tenantId,
          propertyId: existingSpace?.propertyId ?? '',
          spaceId: existing.spaceId,
          startDate: existing.startDate,
          endDate: existing.endDate ?? '',
          firstRentDueDate: existing.firstRentDueDate,
          rentAmount: minorToEditable(existing.rentAmount),
          rentFrequency: existing.rentFrequency,
          securityDeposit: minorToEditable(existing.securityDepositAmount),
          notes: existing.notes ?? '',
        };

  const handleSubmit = (values: AgreementFormValues) => {
    try {
      if (mode === 'create') {
        const created = createRentalAgreement.execute({
          tenantId: values.tenantId,
          propertyId: values.propertyId,
          spaceId: values.spaceId,
          startDate: values.startDate,
          endDate: values.endDate,
          rentAmount: values.rentAmountMinor,
          rentFrequency: values.rentFrequency,
          firstRentDueDate: values.firstRentDueDate,
          securityDepositAmount: values.securityDepositMinor,
          notes: values.notes,
        });
        router.replace(`/agreements/${created.id}`);
        return;
      }
      if (existing !== null) {
        updateRentalAgreement.execute({
          id: existing.id,
          tenantId: values.tenantId,
          propertyId: values.propertyId,
          spaceId: values.spaceId,
          startDate: values.startDate,
          endDate: values.endDate,
          rentAmount: values.rentAmountMinor,
          rentFrequency: values.rentFrequency,
          firstRentDueDate: values.firstRentDueDate,
          securityDepositAmount: values.securityDepositMinor,
          notes: values.notes,
        });
        router.back();
      }
    } catch (caught) {
      setError(t(agreementErrorKey(caught)));
    }
  };

  return (
    <AgreementForm
      mode={mode}
      locked={locked}
      tenantOptions={tenantOptions}
      propertyOptions={propertyOptions}
      spaceOptions={spaceOptions}
      initialValues={initialValues}
      error={error}
      onPropertyChange={setPropertyId}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      onAddTenant={() => router.push('/tenants/new')}
      onAddProperty={() => router.push('/properties/new')}
      onManageSpaces={() => router.push(`/properties/${propertyId}`)}
    />
  );
}
