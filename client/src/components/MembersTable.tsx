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
import {
  accountedPresentCount,
  extraMemberSlotCount,
  newMemberSlotCount,
} from '../utils/presentMembers';
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
  const namedSaved = savedOnFile.filter((m) => m.name.trim());
  const savedCount = namedSaved.length;
  const accounted = accountedPresentCount(savedOnFile);
  const slotCount = isEditing
    ? newMemberSlotCount(presentToday, savedOnFile)
    : extraMemberSlotCount(presentToday);

  useEffect(() => {
    const target = slotCount;
    const current = getValues('members') ?? [];
    if (current.length === target) return;

    const next = [...current];
    while (next.length < target) next.push({ ...emptyMember });
    while (next.length > target) next.pop();
    replace(next);
  }, [slotCount, getValues, replace]);

  const memberNumber = (rowIndex: number) =>
    2 + savedCount + rowIndex;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold">Present family members</h3>
        <p className="text-sm text-muted-foreground">
          {presentToday <= 1
            ? '1 person present ? use Full name above only.'
            : isEditing
              ? `${presentToday} present ? ${accounted} counted (head + ${savedCount} on file)${
                  slotCount > 0
                    ? ` ? fill ${slotCount} more below`
                    : ' ? all slots filled'
                }.`
              : `${presentToday} present ? fill ${slotCount} member${slotCount === 1 ? '' : 's'} below (head is above).`}
        </p>
      </div>

      {namedSaved.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
            Already on file (no need to re-enter)
          </p>
          <div className="flex flex-wrap gap-2">
            {namedSaved.map((m, i) => (
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
          {isEditing && accounted >= presentToday
            ? `${accounted} people counted for ${presentToday} present. Increase Present today to add more.`
            : 'No extra rows ? increase Present today to add member fields.'}
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border bg-muted/30 p-3 space-y-3 sm:space-y-0 sm:grid sm:gap-3 sm:grid-cols-[minmax(0,1fr)_72px_minmax(110px,1fr)_96px] sm:items-start"
          >
            <p className="text-xs font-semibold text-primary sm:col-span-4">
              {isEditing ? 'New arrival' : 'Present member'} {memberNumber(index)} of {presentToday}
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
              <Input
                placeholder="Age"
                type="number"
                min={0}
                max={120}
                step={1}
                inputMode="numeric"
                {...register(`members.${index}.age`)}
              />
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
