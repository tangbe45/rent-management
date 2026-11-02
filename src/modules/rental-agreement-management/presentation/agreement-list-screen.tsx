import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { listRentalAgreements } from '../infrastructure/composition-root';
import { AgreementList, type AgreementLifecycleFilter } from './agreement-list';

export function AgreementListScreen() {
  const filterRef = useRef<AgreementLifecycleFilter>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<AgreementLifecycleFilter>('ALL');
  const [page, setPage] = useState(() => listRentalAgreements.execute());

  const reload = useCallback(() => {
    const filter = filterRef.current;
    setPage(
      listRentalAgreements.execute({ lifecycle: filter === 'ALL' ? undefined : filter }),
    );
  }, []);

  useFocusEffect(reload);

  const handleFilterChange = (next: AgreementLifecycleFilter) => {
    filterRef.current = next;
    setLifecycleFilter(next);
    setPage(listRentalAgreements.execute({ lifecycle: next === 'ALL' ? undefined : next }));
  };

  const handleLoadMore = () => {
    const filter = filterRef.current;
    const next = listRentalAgreements.execute({
      lifecycle: filter === 'ALL' ? undefined : filter,
      offset: page.items.length,
    });
    setPage({ items: [...page.items, ...next.items], total: next.total });
  };

  return (
    <AgreementList
      items={page.items}
      total={page.total}
      lifecycleFilter={lifecycleFilter}
      onLifecycleFilterChange={handleFilterChange}
      onOpen={(id) => router.push(`/agreements/${id}`)}
      onCreate={() => router.push('/agreements/new')}
      onLoadMore={handleLoadMore}
    />
  );
}
