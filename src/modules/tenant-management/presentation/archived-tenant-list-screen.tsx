import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import { confirmLifecycleAction } from '../../property-management/presentation/confirmation';
import {
  DEFAULT_TENANT_PAGE_SIZE,
  type TenantPage,
} from '../domain/tenant-repository';
import { listArchivedTenants, restoreTenant } from '../infrastructure/composition-root';
import { ArchivedTenantList } from './archived-tenant-list';

export function ArchivedTenantListScreen() {
  const { t } = useTranslation();
  const searchRef = useRef('');

  const [search, setSearch] = useState('');
  /**
   * The first read happens in the guarded reload below, never during render:
   * a throw there would escape before the screen mounts and leave the user
   * without the localized error or a retry path.
   */
  const [page, setPage] = useState<TenantPage>({ tenants: [], total: 0 });
  /**
   * Number of rows currently displayed and therefore the offset of the next
   * page. A ref (rather than the rendered state) keeps repeated Load more
   * presses from requesting the same page twice before React re-renders.
   */
  const loadedCountRef = useRef(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    try {
      const limit = Math.max(loadedCountRef.current, DEFAULT_TENANT_PAGE_SIZE);
      const next = listArchivedTenants.execute({ search: searchRef.current, limit });
      // Read both values before storing either so a failing count leaves the
      // results already on screen untouched.
      const total = listArchivedTenants.count();
      loadedCountRef.current = next.tenants.length;
      setPage(next);
      setArchivedTotal(total);
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
      const next = listArchivedTenants.execute({ search: term });
      // A successful search also recovers a screen whose first read failed:
      // without the loaded flag and the unfiltered total, a zero-match search
      // would clear the error yet render no empty state at all.
      const total = listArchivedTenants.count();
      searchRef.current = term;
      loadedCountRef.current = next.tenants.length;
      setSearch(term);
      setPage(next);
      setArchivedTotal(total);
      setLoaded(true);
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  };

  const handleLoadMore = () => {
    const offset = loadedCountRef.current;
    if (offset >= page.total) {
      return;
    }

    try {
      const next = listArchivedTenants.execute({
        search: searchRef.current,
        limit: DEFAULT_TENANT_PAGE_SIZE,
        offset,
      });
      if (next.tenants.length === 0) {
        return;
      }
      loadedCountRef.current = offset + next.tenants.length;
      setPage((current) => ({
        tenants: [...current.tenants, ...next.tenants],
        total: next.total,
      }));
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  };

  const handleRestore = (id: string) => {
    try {
      restoreTenant.execute({ id });
      setError(undefined);
      reload();
    } catch {
      setError(t('tenants.error.generic'));
    }
  };

  const confirmRestore = (id: string) =>
    confirmLifecycleAction(
      {
        title: t('tenants.confirm.restore.title'),
        message: t('tenants.confirm.restore.body'),
        confirmLabel: t('tenants.action.restore'),
        cancelLabel: t('common.cancel'),
      },
      () => handleRestore(id),
    );

  return (
    <ArchivedTenantList
      tenants={page.tenants}
      total={page.total}
      archivedTotal={archivedTotal}
      loaded={loaded}
      search={search}
      error={error}
      onSearchChange={handleSearchChange}
      onLoadMore={handleLoadMore}
      onOpen={(id) => router.push(`/tenants/${id}`)}
      onRestore={confirmRestore}
      onBack={() => router.back()}
    />
  );
}
