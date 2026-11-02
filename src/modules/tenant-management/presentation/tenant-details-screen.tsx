import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import { confirmLifecycleAction } from '../../property-management/presentation/confirmation';
import { ArchiveBlockedByActiveTenantRentalAgreementsError } from '../application/errors';
import type { Tenant } from '../domain/tenant';
import { archiveTenant, getTenant, restoreTenant } from '../infrastructure/composition-root';
import { TenantDetails } from './tenant-details';
import { TenantMessage } from './tenant-ui';

interface TenantDetailsScreenProps {
  tenantId: string;
}

export function TenantDetailsScreen({ tenantId }: TenantDetailsScreenProps) {
  const { t } = useTranslation();
  const [tenant, setTenant] = useState<Tenant | null>(() =>
    getTenant.execute({ id: tenantId }),
  );
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    setTenant(getTenant.execute({ id: tenantId }));
  }, [tenantId]);

  useFocusEffect(reload);

  if (tenant === null) {
    return (
      <TenantMessage
        title={t('tenants.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const handleArchive = () => {
    try {
      archiveTenant.execute({ id: tenant.id });
      setError(undefined);
      reload();
    } catch (caught) {
      setError(
        caught instanceof ArchiveBlockedByActiveTenantRentalAgreementsError
          ? t('tenants.error.archiveBlocked')
          : t('tenants.error.generic'),
      );
    }
  };

  const handleRestore = () => {
    try {
      restoreTenant.execute({ id: tenant.id });
      setError(undefined);
      reload();
    } catch {
      setError(t('tenants.error.generic'));
    }
  };

  const confirmArchive = () =>
    confirmLifecycleAction(
      {
        title: t('tenants.confirm.archive.title'),
        message: t('tenants.confirm.archive.body'),
        confirmLabel: t('tenants.action.archive'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      },
      handleArchive,
    );

  const confirmRestore = () =>
    confirmLifecycleAction(
      {
        title: t('tenants.confirm.restore.title'),
        message: t('tenants.confirm.restore.body'),
        confirmLabel: t('tenants.action.restore'),
        cancelLabel: t('common.cancel'),
      },
      handleRestore,
    );

  return (
    <TenantDetails
      tenant={tenant}
      error={error}
      onEdit={() => router.push(`/tenants/${tenant.id}/edit`)}
      onOpenRent={() => router.push(`/rent/tenants/${tenant.id}`)}
      onCreateAgreement={() => router.push(`/agreements/new?tenantId=${tenant.id}`)}
      onArchive={confirmArchive}
      onRestore={confirmRestore}
      onBack={() => router.back()}
    />
  );
}
