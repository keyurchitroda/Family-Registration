import type { FamilyMember, Registration } from '../types';

function parseMembersJson(raw: string): FamilyMember[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      name: String((m as FamilyMember).name || ''),
      age:
        typeof (m as FamilyMember).age === 'number'
          ? (m as FamilyMember).age
          : Number((m as FamilyMember).age) || undefined,
      relation: (m as FamilyMember).relation ? String((m as FamilyMember).relation) : undefined,
      gender: (m as FamilyMember).gender ? String((m as FamilyMember).gender) : undefined,
      tokenGiven: Boolean((m as FamilyMember).tokenGiven),
    }));
  } catch {
    return [];
  }
}

/** Live Excel sometimes has member JSON in Notes — recover for UI until server repair runs. */
export function recoverRegistration(r: Registration): Registration {
  if (r.members.some((m) => m.name.trim())) return r;
  const notes = r.notes?.trim() ?? '';
  if (!notes.startsWith('[') || !notes.includes('"name"')) return r;
  const members = parseMembersJson(notes);
  if (members.length === 0) return r;
  return { ...r, members, notes: '' };
}
