/** Member rows besides family head. 2 present → 1 row, 3 present → 2 rows, etc. */
export function extraMemberSlotCount(presentToday: number): number {
  const n = Math.floor(Number(presentToday)) || 0;
  return Math.max(0, n - 1);
}
