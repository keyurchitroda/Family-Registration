import type { QueryClient } from '@tanstack/react-query';
import type { Registration } from '../types';
import type { RegistrationPayload } from '../services/api';

export function payloadToRegistration(
  rowIndex: number,
  payload: RegistrationPayload & { time?: string },
): Registration {
  return {
    rowIndex,
    fullName: payload.fullName,
    mobile: payload.mobile,
    address: payload.address,
    totalFamily: payload.totalFamily,
    presentToday: payload.presentToday,
    tokenGiven: Boolean(payload.tokenGiven),
    members: payload.members,
    notes: payload.notes?.trim() || '',
    time: payload.time?.trim() || new Date().toISOString(),
  };
}

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

/** Update admin + search caches immediately after save (no wait for refetch). */
export function upsertRegistrationInCaches(qc: QueryClient, reg: Registration): void {
  qc.setQueriesData<Registration[]>({ queryKey: ['admin-list'] }, (old) => patchList(old, reg));
  qc.setQueriesData<Registration[]>({ queryKey: ['search'] }, (old) => patchList(old, reg));
}

export function removeRegistrationFromCaches(qc: QueryClient, rowIndex: number): void {
  const drop = (old: Registration[] | undefined) => old?.filter((r) => r.rowIndex !== rowIndex);
  qc.setQueriesData<Registration[]>({ queryKey: ['admin-list'] }, drop);
  qc.setQueriesData<Registration[]>({ queryKey: ['search'] }, drop);
}

/** Refetch stats + lists from server (run after optimistic patch). */
export async function refreshRegistrationCaches(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.refetchQueries({ queryKey: ['stats'] }),
    qc.refetchQueries({ queryKey: ['admin-list'] }),
    qc.refetchQueries({ queryKey: ['search'] }),
  ]);
}
