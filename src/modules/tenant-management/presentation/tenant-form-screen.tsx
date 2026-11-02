import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import type { Tenant } from '../domain/tenant';
import { createTenant, getTenant, updateTenant } from '../infrastructure/composition-root';
import { TenantForm, type TenantFormMode, type TenantFormValues } from './tenant-form';
import { TenantMessage } from './tenant-ui';

interface TenantFormScreenProps {
  mode: TenantFormMode;
  tenantId?: string;
}

export function TenantFormScreen({ mode, tenantId }: TenantFormScreenProps) {
  const { t } = useTranslation();
  /**
   * Create mode needs no read, so it is usable from the first render. Edit mode
   * loads the record in the guarded reload below and never renders the form
   * with fabricated defaults while the original is loading or has failed.
   */
  const [existing, setExisting] = useState<Tenant | null>(null);
  const [loaded, setLoaded] = useState(mode === 'create');
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    if (mode === 'create') {
      return;
    }
    try {
      // `GetTenant` returns null for an unknown id, which the not-found state
      // below handles; only a throw is a read failure. Refreshing `existing`
      // keeps the form's own state, which is keyed by the tenant id.
      setExisting(tenantId === undefined ? null : getTenant.execute({ id: tenantId }));
      setError(undefined);
    } catch {
      setError(t('tenants.error.generic'));
    } finally {
      setLoaded(true);
    }
  }, [mode, tenantId, t]);

  useFocusEffect(reload);

  if (!loaded) {
    return null;
  }

  if (mode === 'edit' && existing === null) {
    return (
      <TenantMessage
        title={error ?? t('tenants.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const handleSubmit = (values: TenantFormValues) => {
    try {
      if (mode === 'create') {
        const created = createTenant.execute(values);
        router.replace(`/tenants/${created.id}`);
        return;
      }
      if (existing !== null) {
        updateTenant.execute({ id: existing.id, ...values });
      }
      router.back();
    } catch {
      setError(t('tenants.error.generic'));
    }
  };

  return (
    <TenantForm
      key={existing?.id ?? 'create'}
      mode={mode}
      initialValues={
        existing !== null
          ? {
              fullName: existing.fullName,
              phone: existing.phone ?? '',
              secondPhoneNumber: existing.secondPhoneNumber ?? '',
              email: existing.email ?? '',
              nationalIdCardNumber: existing.nationalIdCardNumber ?? '',
              notes: existing.notes ?? '',
            }
          : undefined
      }
      error={error}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
