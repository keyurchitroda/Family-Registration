import { Plus, Trash2 } from 'lucide-react';
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import type { FamilyMember } from '../types';
import type { RegistrationFormValues } from '../utils/validation';
import { emptyMember, MEMBER_RELATIONS } from '../utils/memberRelations';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

const selectClass =
  'flex h-12 w-full rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type Props = {
  control: Control<RegistrationFormValues>;
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
  /** Already saved on file (when editing existing family) */
  savedOnFile?: FamilyMember[];
  isEditing?: boolean;
};

export function MembersTable({
  control,
  register,
  errors,
  savedOnFile = [],
  isEditing = false,
}: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">Present family members</h3>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Already saved names are listed below. Use Add only for NEW people who came today.'
              : 'Optional. Single person? Use main form only. Add others who came today.'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => append({ ...emptyMember })}
        >
          <Plus className="h-4 w-4" /> Add new
        </Button>
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

      {fields.length === 0 && !isEditing && (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          No extra members. The person in Full name above is the attendee.
        </p>
      )}

      {fields.length === 0 && isEditing && (
        <p className="rounded-lg border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">
          Tap <strong>Add new</strong> to register another person who came today.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border bg-muted/30 p-3 space-y-3 sm:space-y-0 sm:grid sm:gap-3 sm:grid-cols-[minmax(0,1fr)_72px_minmax(110px,1fr)_96px_44px] sm:items-start"
          >
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground sm:sr-only">
                Name
              </Label>
              <Input
                placeholder="New member name"
                {...register(`members.${index}.name`)}
                className={cn(errors.members?.[index]?.name && 'border-red-500')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    append({ ...emptyMember });
                    const ni = fields.length;
                    setTimeout(() => {
                      document
                        .querySelector<HTMLInputElement>(`input[name="members.${ni}.name"]`)
                        ?.focus();
                    }, 0);
                  }
                }}
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-600"
              onClick={() => remove(index)}
              aria-label="Remove member"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
