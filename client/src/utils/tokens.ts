import type { Registration } from '../types';

export type TokenStats = {
  /** Physical tokens already given (head + members) */
  given: number;
  totalFamily: number;
  presentToday: number;
  /** Among people marked present today, how many still need a token */
  pendingAmongPresent: number;
  /** Family slots without a name in the member list */
  notListed: number;
};

export function getTokenStatsFromFields(
  tokenGiven: boolean,
  members: Registration['members'],
  totalFamily: number,
  presentToday: number,
): TokenStats {
  return getTokenStats({
    rowIndex: 0,
    fullName: '',
    mobile: '',
    address: '',
    totalFamily,
    presentToday,
    tokenGiven,
    members,
    notes: '',
    time: '',
  });
}

export function getTokenStats(r: Registration): TokenStats {
  const totalFamily = Math.max(1, r.totalFamily);
  const presentToday = Math.max(0, r.presentToday);
  const given =
    (r.tokenGiven ? 1 : 0) + r.members.filter((m) => m.tokenGiven).length;
  const pendingAmongPresent = Math.max(0, presentToday - given);
  const listed =
    1 + r.members.filter((m) => m.name.trim()).length;
  const notListed = Math.max(0, totalFamily - listed);

  return {
    given,
    totalFamily,
    presentToday,
    pendingAmongPresent,
    notListed,
  };
}

/** Short label for admin table */
export function tokenSummaryLabel(r: Registration): string {
  const s = getTokenStats(r);
  const parts: string[] = [`${s.given}/${s.totalFamily} tokens`];
  if (s.pendingAmongPresent > 0) {
    parts.push(
      `${s.pendingAmongPresent} pending (of ${s.presentToday} present)`,
    );
  }
  if (s.notListed > 0) {
    parts.push(`${s.notListed} not listed`);
  }
  return parts.join(' · ');
}

/** Second line in admin table — highlights present people waiting for token */
export function tokenPendingPresentHint(r: Registration): string | null {
  const { pendingAmongPresent, presentToday, given } = getTokenStats(r);
  if (presentToday === 0) {
    return 'No one marked present';
  }
  if (pendingAmongPresent > 0) {
    const n = pendingAmongPresent;
    return `${n} family member${n === 1 ? '' : 's'} present — token still pending`;
  }
  if (given > presentToday) {
    return `All ${presentToday} present have tokens`;
  }
  return `All ${presentToday} present have tokens`;
}
