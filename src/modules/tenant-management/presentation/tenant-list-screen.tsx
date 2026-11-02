import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { TenantPage } from '../domain/tenant-repository';
import { listTenants } from '../infrastructure/composition-root';
import { TenantList } from './tenant-list';

export function TenantListScreen() {
  const searchRef = useRef('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<TenantPage>(() => listTenants.execute());

  const reload = useCallback(() => {
    setPage(listTenants.execute({ search: searchRef.current }));
  }, []);

  useFocusEffect(reload);

  const handleSearchChange = (term: string) => {
    searchRef.current = term;
    setSearch(term);
    setPage(listTenants.execute({ search: term }));
  };

  const handleLoadMore = () => {
    const next = listTenants.execute({ search: searchRef.current, offset: page.tenants.length });
    setPage({ tenants: [...page.tenants, ...next.tenants], total: next.total });
  };

  return (
    <TenantList
      tenants={page.tenants}
      total={page.total}
      search={search}
      onOpen={(id) => router.push(`/tenants/${id}`)}
      onCreate={() => router.push('/tenants/new')}
      onOpenArchived={() => router.push('/tenants/archived')}
      onSearchChange={handleSearchChange}
      onLoadMore={handleLoadMore}
    />
  );
}
