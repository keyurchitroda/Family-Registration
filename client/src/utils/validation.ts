import { z } from 'zod';

export const memberSchema = z.object({
  name: z.string(),
  age: z
    .string()
    .optional()
    .refine(
      (s) => !s?.trim() || (!Number.isNaN(Number(s)) && Number(s) >= 0 && Number(s) <= 120),
      { message: 'Age 0–120 or leave blank' },
    ),
  relation: z.string().optional(),
  gender: z.string().optional(),
});

export const registrationSchema = z
  .object({
    fullName: z.string().min(2, 'Enter full name'),
    mobile: z.string().min(7, 'Enter valid mobile'),
    address: z.string().min(3, 'Enter address'),
    totalFamily: z.coerce
      .number()
      .int('Must be a whole number')
      .min(1, 'At least 1 — no minus'),
    presentToday: z.coerce
      .number()
      .int('Must be a whole number')
      .min(0, 'Cannot be negative'),
    members: z.array(memberSchema),
    notes: z.string().optional(),
  })
  .refine((d) => d.presentToday <= d.totalFamily, {
    message: 'Present today cannot exceed total family',
    path: ['presentToday'],
  })
  .superRefine((d, ctx) => {
    d.members.forEach((m, i) => {
      const hasName = Boolean(m.name?.trim());
      const hasOther = Boolean(m.age?.trim() || m.relation?.trim() || m.gender?.trim());
      if (!hasName && hasOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter name or clear this row',
          path: ['members', i, 'name'],
        });
      }
    });
  });

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function parseMemberAge(age?: string): number | undefined {
  if (!age?.trim()) return undefined;
  const n = Number(age);
  return Number.isFinite(n) ? n : undefined;
}

/** Keep only rows with a name; optional dedupe by name (same family, do not list twice) */
export function membersForSave(
  members: RegistrationFormValues['members'],
): { name: string; age?: number; relation?: string; gender?: string }[] {
  const saved = members
    .filter((m) => m.name?.trim())
    .map((m) => ({
      name: m.name.trim(),
      age: parseMemberAge(m.age),
      relation: m.relation?.trim() || undefined,
      gender: m.gender?.trim() || undefined,
    }));
  const seen = new Set<string>();
  return saved.filter((m) => {
    const key = m.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
