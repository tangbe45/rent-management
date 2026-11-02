import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import type { TenantPage } from '../domain/tenant-repository';
import { listTenants } from '../infrastructure/composition-root';
import { TenantList } from './tenant-list';

export function TenantListScreen() {
  const { t } = useTranslation();
  const searchRef = useRef('');

  const [search, setSearch] = useState('');
  /**
   * The first read happens in the guarded reload below, never during render:
   * a throw there would escape before the screen mounts and leave the user
   * without the localized error or a retry path.
   */
  const [page, setPage] = useState<TenantPage>({ tenants: [], total: 0 });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    try {
      const next = listTenants.execute({ search: searchRef.current });
      setPage(next);
      setLoaded(true);
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  }, [t]);

  useFocusEffect(reload);

  const handleSearchChange = (term: string) => {
    try {
      // A new term always starts at the first page; previous results are
      // replaced rather than appended. Database reads are synchronous, so a
      // late response can never overwrite a newer query.
      const next = listTenants.execute({ search: term });
      searchRef.current = term;
      setSearch(term);
      setPage(next);
      setLoaded(true);
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  };

  const handleLoadMore = () => {
    try {
      const next = listTenants.execute({ search: searchRef.current, offset: page.tenants.length });
      setPage({ tenants: [...page.tenants, ...next.tenants], total: next.total });
      setLoaded(true);
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  };

  return (
    <TenantList
      tenants={page.tenants}
      total={page.total}
      loaded={loaded}
      search={search}
      error={error}
      onOpen={(id) => router.push(`/tenants/${id}`)}
      onCreate={() => router.push('/tenants/new')}
      onOpenArchived={() => router.push('/tenants/archived')}
      onSearchChange={handleSearchChange}
      onLoadMore={handleLoadMore}
    />
  );
}
