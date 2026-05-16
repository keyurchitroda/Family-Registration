import type { QueryClient } from '@tanstack/react-query';
import { fetchStats } from '../services/api';
import type { Registration } from '../types';

function patchList(old: Registration[] | undefined, reg: Registration): Registration[] {
  if (!old) return [reg];
  const i = old.findIndex((r) => r.rowIndex === reg.rowIndex);
  if (i >= 0) {
    const next = [...old];
    next[i] = reg;
    return next;
  }
  return [reg, ...old];
}

/** Apply server-returned row to all list caches immediately. */
export function upsertRegistrationInCaches(qc: QueryClient, reg: Registration): void {
  qc.setQueriesData<Registration[]>({ queryKey: ['admin-list'] }, (old) => patchList(old, reg));
  qc.setQueriesData<Registration[]>({ queryKey: ['search'] }, (old) => patchList(old, reg));
}

export function removeRegistrationFromCaches(qc: QueryClient, rowIndex: number): void {
  const drop = (old: Registration[] | undefined) => old?.filter((r) => r.rowIndex !== rowIndex);
  qc.setQueriesData<Registration[]>({ queryKey: ['admin-list'] }, drop);
  qc.setQueriesData<Registration[]>({ queryKey: ['search'] }, drop);
}

/**
 * Hard refresh after save: reset caches and refetch from API (cache-busted).
 * Call after upserting the saved row so UI never flashes stale data.
 */
export async function hardRefreshAfterSave(
  qc: QueryClient,
  saved?: Registration,
): Promise<void> {
  if (saved) {
    upsertRegistrationInCaches(qc, saved);
  }

  qc.removeQueries({ queryKey: ['stats'] });
  qc.removeQueries({ queryKey: ['admin-list'] });
  qc.removeQueries({ queryKey: ['search'] });

  await Promise.all([
    qc.fetchQuery({ queryKey: ['stats'], queryFn: fetchStats }),
    qc.refetchQueries({ queryKey: ['admin-list'], type: 'all' }),
    qc.refetchQueries({ queryKey: ['search'], type: 'all' }),
  ]);
}
