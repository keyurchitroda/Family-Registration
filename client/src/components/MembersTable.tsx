import { useEffect } from 'react';
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
} from 'react-hook-form';
import type { FamilyMember } from '../types';
import type { RegistrationFormValues } from '../utils/validation';
import { emptyMember, MEMBER_RELATIONS } from '../utils/memberRelations';
import { extraMemberSlotCount } from '../utils/presentMembers';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

const selectClass =
  'flex h-12 w-full rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type Props = {
  control: Control<RegistrationFormValues>;
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
  presentToday: number;
  getValues: UseFormGetValues<RegistrationFormValues>;
  savedOnFile?: FamilyMember[];
  isEditing?: boolean;
};

export function MembersTable({
  control,
  register,
  errors,
  presentToday,
  getValues,
  savedOnFile = [],
  isEditing = false,
}: Props) {
  const { fields, replace } = useFieldArray({ control, name: 'members' });
  const slotCount = extraMemberSlotCount(presentToday);

  useEffect(() => {
    const target = slotCount;
    const current = getValues('members') ?? [];
    if (current.length === target) return;

    const next = [...current];
    while (next.length < target) next.push({ ...emptyMember });
    while (next.length > target) next.pop();
    replace(next);
  }, [slotCount, getValues, replace]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold">Present family members</h3>
        <p className="text-sm text-muted-foreground">
          {presentToday <= 1
            ? '1 person present ? use Full name above only.'
            : `${presentToday} present ? fill ${slotCount} more member${slotCount === 1 ? '' : 's'} below (head is above).`}
          {isEditing && ' Already saved names are shown above; only fill empty rows for new arrivals.'}
        </p>
      </div>

      {savedOnFile.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
            Already on file (no need to re-enter)
          </p>
          <div className="flex flex-wrap gap-2">
            {savedOnFile.map((m, i) => (
              <span
                key={`${m.name}-${i}`}
                className="rounded-full bg-card px-3 py-1 text-sm font-medium shadow-sm"
              >
                {m.name}
                {m.relation ? ` (${m.relation})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {slotCount === 0 && (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          No extra rows ? increase <strong>Present today</strong> to add more member fields.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border bg-muted/30 p-3 space-y-3 sm:space-y-0 sm:grid sm:gap-3 sm:grid-cols-[minmax(0,1fr)_72px_minmax(110px,1fr)_96px] sm:items-start"
          >
            <p className="text-xs font-semibold text-primary sm:col-span-4">
              Present member {index + 2} of {presentToday}
            </p>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground sm:sr-only">
                Name
              </Label>
              <Input
                placeholder="Member name"
                {...register(`members.${index}.name`)}
                className={cn(errors.members?.[index]?.name && 'border-red-500')}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground sm:sr-only">
                Age
              </Label>
              <Input placeholder="Age" inputMode="numeric" {...register(`members.${index}.age`)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground sm:sr-only">
                Relation
              </Label>
              <Controller
                control={control}
                name={`members.${index}.relation`}
                render={({ field: f }) => (
                  <select {...f} className={selectClass}>
                    <option value="">Relation</option>
                    {MEMBER_RELATIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground sm:sr-only">
                Gender
              </Label>
              <Controller
                control={control}
                name={`members.${index}.gender`}
                render={({ field: f }) => (
                  <select {...f} className={selectClass}>
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
