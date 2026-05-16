import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Save } from 'lucide-react';
import { SmartSearchBar } from '../components/SmartSearchBar';
import { MembersTable } from '../components/MembersTable';
import {
  checkDuplicate,
  createRegistration,
  findFamilyByMobile,
  updateRegistration,
  type Registration,
  type RegistrationPayload,
} from '../services/api';
import type { FamilyMember } from '../types';
import {
  registrationSchema,
  type RegistrationFormValues,
  membersForSave,
} from '../utils/validation';
import { emptyMember } from '../utils/memberRelations';
import { newMemberSlotCount } from '../utils/presentMembers';
import { recoverRegistration } from '../utils/recoverRegistration';
import {
  payloadToRegistration,
  refreshRegistrationCaches,
  upsertRegistrationInCaches,
} from '../lib/registrationCache';
import { playSuccessSound } from '../utils/sound';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const defaults: RegistrationFormValues = {
  fullName: '',
  mobile: '',
  address: '',
  totalFamily: 1,
  presentToday: 1,
  members: [],
  notes: '',
};

function mapToForm(r: Registration, newMemberRowsOnly: boolean): RegistrationFormValues {
  return {
    fullName: r.fullName,
    mobile: r.mobile,
    address: r.address,
    totalFamily: r.totalFamily,
    presentToday: r.presentToday,
    members: newMemberRowsOnly
      ? Array.from(
          { length: newMemberSlotCount(r.presentToday, r.members) },
          () => ({ ...emptyMember }),
        )
      : r.members.slice(0, newMemberSlotCount(r.presentToday, [])).map((m) => ({
          name: m.name,
          age: m.age != null ? String(m.age) : '',
          relation: m.relation || '',
          gender: m.gender || '',
        })),
    notes: r.notes,
  };
}

function mergeAllMembers(saved: FamilyMember[], incoming: FamilyMember[]): FamilyMember[] {
  const byName = new Map<string, FamilyMember>();
  for (const m of saved) {
    const key = m.name.trim().toLowerCase();
    if (key) byName.set(key, m);
  }
  for (const m of incoming) {
    const key = m.name.trim().toLowerCase();
    if (!key || byName.has(key)) continue;
    byName.set(key, { ...m, tokenGiven: m.tokenGiven ?? false });
  }
  return Array.from(byName.values());
}

export function RegisterPage() {
  const qc = useQueryClient();
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [savedTime, setSavedTime] = useState<string | undefined>();
  const [savedOnFile, setSavedOnFile] = useState<FamilyMember[]>([]);
  const [savedTokenGiven, setSavedTokenGiven] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupInfo, setDupInfo] = useState<Registration | null>(null);
  const [pending, setPending] = useState<RegistrationPayload | null>(null);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: defaults,
  });

  const { register, control, handleSubmit, reset, formState, setFocus, watch, getValues } = form;
  const mobileWatch = watch('mobile');
  const presentTodayWatch = watch('presentToday');

  useEffect(() => {
    setFocus('fullName');
  }, [setFocus]);

  const loadFamily = useCallback(
    (r: Registration, message?: string) => {
      const reg = recoverRegistration(r);
      setEditingRow(reg.rowIndex);
      setSavedTime(reg.time);
      setSavedOnFile(reg.members);
      setSavedTokenGiven(reg.tokenGiven);
      reset(mapToForm(reg, true));
      toast.success(message ?? 'Family loaded. Add NEW present members only, then Update.');
    },
    [reset],
  );

  const clearForm = useCallback(() => {
    reset(defaults);
    setEditingRow(null);
    setSavedTime(undefined);
    setSavedOnFile([]);
    setSavedTokenGiven(false);
  }, [reset]);

  const toPayload = useCallback(
    (values: RegistrationFormValues): RegistrationPayload => {
      const newMembers = membersForSave(values.members);
      const allMembers = editingRow
        ? mergeAllMembers(savedOnFile, newMembers)
        : newMembers;
      return {
        fullName: values.fullName.trim(),
        mobile: values.mobile.trim(),
        address: values.address.trim(),
        totalFamily: values.totalFamily,
        presentToday: values.presentToday,
        tokenGiven: editingRow ? savedTokenGiven : false,
        members: allMembers,
        notes: values.notes?.trim(),
        ...(editingRow && savedTime ? { time: savedTime } : {}),
      };
    },
    [editingRow, savedOnFile, savedTime, savedTokenGiven],
  );

  const mutation = useMutation({
    mutationFn: async ({ payload, row }: { payload: RegistrationPayload; row: number | null }) => {
      if (row) {
        await updateRegistration(row, payload);
        return { mode: 'update' as const, rowIndex: row, payload };
      }
      const { rowIndex } = await createRegistration(payload);
      return { mode: 'create' as const, rowIndex, payload };
    },
    onSuccess: ({ mode, rowIndex, payload }) => {
      upsertRegistrationInCaches(qc, payloadToRegistration(rowIndex, payload));
      clearForm();
      playSuccessSound();
      toast.success(mode === 'update' ? 'Updated in Excel' : 'Saved to Excel');
      void refreshRegistrationCaches(qc);
    },
    onError: (e: Error) => toast.error(e.message || 'Save failed'),
  });

  const submit = useCallback(
    (values: RegistrationFormValues) => {
      mutation.mutate({ payload: toPayload(values), row: editingRow });
    },
    [editingRow, mutation, toPayload],
  );

  const onValid = useCallback(
    async (values: RegistrationFormValues) => {
      if (!editingRow) {
        const byMobile = await findFamilyByMobile(values.mobile);
        if (byMobile.found && byMobile.registration) {
          setDupInfo(byMobile.registration);
          setPending(toPayload(values));
          setDupOpen(true);
          return;
        }
        const dup = await checkDuplicate(values.mobile);
        if (dup.duplicate && dup.existing) {
          setDupInfo(dup.existing);
          setPending(toPayload(values));
          setDupOpen(true);
          return;
        }
      }
      submit(values);
    },
    [editingRow, submit, toPayload],
  );

  const lookupMobile = useCallback(async () => {
    const m = mobileWatch?.trim();
    if (!m || m.length < 7 || editingRow) return;
    const { found, registration } = await findFamilyByMobile(m);
    if (found && registration) {
      toast.info('This mobile is already registered', {
        description: `${registration.fullName} — tap to open`,
        action: {
          label: 'Open family',
          onClick: () => loadFamily(registration),
        },
        duration: 8000,
      });
    }
  }, [mobileWatch, editingRow, loadFamily]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSubmit(onValid)();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSubmit, onValid]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Registration</h2>
        <p className="text-muted-foreground">
          <strong>Step 1:</strong> Search mobile or name. If family exists, open it and add only new
          people. <strong>Step 2:</strong> Otherwise fill form for a new family.{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">Ctrl+S</kbd> save.
        </p>
        {editingRow && (
          <p className="mt-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            Updating existing family (row #{editingRow}) — do not create a duplicate entry
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick search</CardTitle>
        </CardHeader>
        <CardContent>
          <SmartSearchBar autoFocus onSelect={(r) => loadFamily(r)} />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{editingRow ? 'Update family' : 'New family'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input id="fullName" {...register('fullName')} className="text-lg" />
                {formState.errors.fullName && (
                  <p className="text-sm text-red-600">{formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  {...register('mobile')}
                  className="text-lg"
                  onBlur={() => void lookupMobile()}
                />
                {formState.errors.mobile && (
                  <p className="text-sm text-red-600">{formState.errors.mobile.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea id="address" {...register('address')} rows={2} />
              {formState.errors.address && (
                <p className="text-sm text-red-600">{formState.errors.address.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalFamily">Total family members</Label>
                <Input id="totalFamily" type="number" {...register('totalFamily')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presentToday">Present today</Label>
                <Input id="presentToday" type="number" {...register('presentToday')} />
                {formState.errors.presentToday && (
                  <p className="text-sm text-red-600">{formState.errors.presentToday.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} rows={2} />
            </div>
            <MembersTable
              control={control}
              register={register}
              errors={formState.errors}
              presentToday={Number(presentTodayWatch) || 0}
              getValues={getValues}
              savedOnFile={savedOnFile}
              isEditing={Boolean(editingRow)}
            />
            <div className="hidden gap-3 sm:flex">
              <Button type="button" variant="outline" size="lg" onClick={clearForm}>
                <RotateCcw className="h-5 w-5" /> Clear
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={mutation.isPending}>
                <Save className="h-5 w-5" />
                {editingRow ? 'Update family' : 'Save registration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 p-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-5xl gap-2">
            <Button type="button" variant="outline" onClick={clearForm}>
              Clear
            </Button>
            <Button type="submit" variant="secondary" className="flex-1" disabled={mutation.isPending}>
              {editingRow ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Family already registered</DialogTitle>
            <DialogDescription>
              {dupInfo
                ? `${dupInfo.fullName} (${dupInfo.mobile}) is already in the sheet. Open them and add only new present members — do not create a second row.`
                : 'This mobile number already exists.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDupOpen(false)}>
              Cancel
            </Button>
            {dupInfo && (
              <Button
                variant="default"
                onClick={() => {
                  loadFamily(dupInfo);
                  setDupOpen(false);
                  setPending(null);
                }}
              >
                Open existing family
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (pending) mutation.mutate({ payload: pending, row: null });
                setDupOpen(false);
                setPending(null);
              }}
            >
              New row anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
