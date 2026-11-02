import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Tenant } from '../domain/tenant';
import { listArchivedTenants, restoreTenant } from '../infrastructure/composition-root';
import { ArchivedTenantList } from './archived-tenant-list';

/**
 * The archived list has no search or pagination UI, so it requests a large page
 * and renders every archived tenant.
 */
const ARCHIVED_LIST_LIMIT = 1000;

export function ArchivedTenantListScreen() {
  const [tenants, setTenants] = useState<readonly Tenant[]>(
    () => listArchivedTenants.execute({ limit: ARCHIVED_LIST_LIMIT }).tenants,
  );

  const reload = useCallback(() => {
    setTenants(listArchivedTenants.execute({ limit: ARCHIVED_LIST_LIMIT }).tenants);
  }, []);

  useFocusEffect(reload);

  const handleRestore = (id: string) => {
    restoreTenant.execute({ id });
    reload();
  };

  return (
    <ArchivedTenantList
      tenants={tenants}
      onOpen={(id) => router.push(`/tenants/${id}`)}
      onRestore={handleRestore}
      onBack={() => router.back()}
    />
  );
}
