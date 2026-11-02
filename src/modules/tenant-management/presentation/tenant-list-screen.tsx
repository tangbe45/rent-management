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
  /**
   * The page currently shown to the user. Reads are synchronous, so two Load
   * more presses can only race in the window between a press and the React
   * commit that shows the appended page. A handler may paginate only the page
   * it was rendered for: a duplicate press sees this ref already advanced to the
   * appended page, and a handler kept from a render whose page a search or focus
   * reload has replaced sees a mismatch. A failed or empty read leaves the ref
   * untouched, so the user can retry.
   */
  const committedPageRef = useRef(page);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    try {
      const next = listTenants.execute({ search: searchRef.current });
      committedPageRef.current = next;
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
      committedPageRef.current = next;
      setSearch(term);
      setPage(next);
      setLoaded(true);
      setError(undefined);
    } catch {
      setError(t('common.error.generic'));
    }
  };

  const handleLoadMore = () => {
    if (committedPageRef.current !== page) {
      // Either this page's next page was already requested (React has not
      // committed the result yet) or this handler belongs to a render whose
      // page a search or focus reload has since replaced. Reading now would
      // repeat the offset or paginate a list that is no longer on screen.
      return;
    }
    if (page.tenants.length >= page.total) {
      return;
    }

    try {
      const next = listTenants.execute({ search: searchRef.current, offset: page.tenants.length });
      if (next.tenants.length === 0) {
        // Nothing to append, so no commit will release the guard.
        return;
      }
      const appended: TenantPage = {
        tenants: [...page.tenants, ...next.tenants],
        total: next.total,
      };
      committedPageRef.current = appended;
      setPage(appended);
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
