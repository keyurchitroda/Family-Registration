import type { FamilyMember } from '../types';

/** Members with a real name (ignore empty rows saved from admin). */
export function countNamedMembers(members: FamilyMember[]): number {
  return members.filter((m) => m.name.trim()).length;
}

/** Member input rows for a new family (head is separate in Full name). */
export function extraMemberSlotCount(presentToday: number): number {
  const present = Math.floor(Number(presentToday)) || 0;
  return Math.max(0, present - 1);
}

/**
 * Editing existing family: present = head + saved members + new rows.
 * Example: 3 present, head + aaa on file → 1 empty row (3 − 1 head − 1 saved).
 */
export function newMemberSlotCount(
  presentToday: number,
  savedMembers: FamilyMember[] | number = 0,
): number {
  const present = Math.floor(Number(presentToday)) || 0;
  const saved =
    typeof savedMembers === 'number'
      ? Math.max(0, Math.floor(savedMembers))
      : countNamedMembers(savedMembers);
  const accounted = 1 + saved;
  return Math.max(0, present - accounted);
}

/** People already counted toward present (head + named members on file). */
export function accountedPresentCount(savedMembers: FamilyMember[]): number {
  return 1 + countNamedMembers(savedMembers);
}
