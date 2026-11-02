import { router } from 'expo-router';
import { useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import { createTenant, getTenant, updateTenant } from '../infrastructure/composition-root';
import { TenantForm, type TenantFormMode, type TenantFormValues } from './tenant-form';
import { TenantMessage } from './tenant-ui';

interface TenantFormScreenProps {
  mode: TenantFormMode;
  tenantId?: string;
}

export function TenantFormScreen({ mode, tenantId }: TenantFormScreenProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | undefined>();

  const existing =
    mode === 'edit' && tenantId !== undefined ? getTenant.execute({ id: tenantId }) : null;

  if (mode === 'edit' && existing === null) {
    return (
      <TenantMessage
        title={t('tenants.details.notFound')}
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
