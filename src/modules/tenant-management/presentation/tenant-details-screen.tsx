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
  /**
   * The first read happens in the guarded reload below, never during render or
   * state initialization: a throw there would escape before the screen mounts
   * and leave the user without the localized error or a retry path.
   */
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    try {
      setTenant(getTenant.execute({ id: tenantId }));
      // A successful read also clears a previous read failure, so regaining
      // focus is a retry path.
      setError(undefined);
    } catch {
      // A failed reload keeps the tenant already on screen and reports the
      // error next to it rather than pretending the record no longer exists.
      setError(t('tenants.error.generic'));
    } finally {
      // Read failures are surfaced as their own state, never left loading.
      setLoaded(true);
    }
  }, [tenantId, t]);

  useFocusEffect(reload);

  if (tenant === null) {
    if (!loaded) {
      return null;
    }
    return (
      <TenantMessage
        // `GetTenant` returns null for a missing id without throwing, so a null
        // tenant with an error is a failed read, not a missing record.
        title={error ?? t('tenants.details.notFound')}
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
