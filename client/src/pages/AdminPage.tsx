import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Pencil, Trash2, Wrench } from 'lucide-react';
import {
  deleteRegistration,
  exportRegistrationsExcel,
  listRegistrations,
  repairAllCorrupt,
  repairRegistration,
  updateRegistration,
  type Registration,
  type RegistrationPayload,
} from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { AdminMemberTokens } from '../components/AdminMemberTokens';
import { getTokenStats, tokenPendingPresentHint, tokenSummaryLabel } from '../utils/tokens';
import { extraMemberSlotCount } from '../utils/presentMembers';
import { recoverRegistration } from '../utils/recoverRegistration';
import { hardRefreshAfterSave, removeRegistrationFromCaches } from '../lib/registrationCache';
import { sanitizeCount } from '../utils/numberInput';
import { cn } from '../lib/utils';

export function AdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const dq = useDebounce(q, 250);

  const { data = [], isPending, isFetching } = useQuery({
    queryKey: ['admin-list', dq, date],
    queryFn: () => listRegistrations({ q: dq, date: date || undefined }),
    placeholderData: (prev) => prev,
  });

  const corruptRows = useMemo(() => data.filter((r) => r.isCorrupt), [data]);
  const goodRows = useMemo(() => data.filter((r) => !r.isCorrupt), [data]);

  const stats = useMemo(
    () => ({
      families: goodRows.length,
      members: goodRows.reduce((s, r) => s + r.totalFamily, 0),
      present: goodRows.reduce((s, r) => s + r.presentToday, 0),
    }),
    [goodRows],
  );

  const [edit, setEdit] = useState<Registration | null>(null);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!edit) throw new Error('Nothing to save');
      const payload: RegistrationPayload & { time?: string } = {
        fullName: edit.fullName,
        mobile: edit.mobile,
        address: edit.address,
        totalFamily: edit.totalFamily,
        presentToday: edit.presentToday,
        tokenGiven: edit.tokenGiven,
        members: edit.members,
        notes: edit.notes,
        time: edit.time,
      };
      return updateRegistration(edit.rowIndex, payload);
    },
    onSuccess: async (registration) => {
      setEdit(null);
      await hardRefreshAfterSave(qc, recoverRegistration(registration));
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRegistration,
    onSuccess: async (_data, rowIndex) => {
      removeRegistrationFromCaches(qc, rowIndex);
      await hardRefreshAfterSave(qc);
      toast.success('Row deleted from Excel');
    },
    onError: (e: Error) => toast.error(e.message || 'Delete failed'),
  });

  const repairMut = useMutation({
    mutationFn: repairRegistration,
    onSuccess: async (fixed) => {
      await hardRefreshAfterSave(qc, recoverRegistration(fixed));
      toast.success('Row repaired and columns fixed');
    },
    onError: (e: Error) => toast.error(e.message || 'Repair failed'),
  });

  const repairAllMut = useMutation({
    mutationFn: repairAllCorrupt,
    onSuccess: async (r) => {
      await hardRefreshAfterSave(qc);
      toast.success(`Fixed ${r.repaired} damaged row(s)`);
    },
    onError: (e: Error) => toast.error(e.message || 'Repair failed'),
  });

  const download = async () => {
    try {
      const blob = await exportRegistrationsExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registrations.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Admin</h2>
        <p className="text-muted-foreground">
          View, edit, delete, and download <code className="text-sm">server/data/registrations.xlsx</code>
        </p>
      </div>

      {corruptRows.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="space-y-3 pt-6">
            <p className="font-bold text-amber-800 dark:text-amber-200">
              {corruptRows.length} damaged Excel row(s) (old save bug — columns shifted)
            </p>
            <p className="text-sm text-muted-foreground">
              These rows could not be deleted before because they were hidden. Use{' '}
              <strong>Delete</strong> to remove, or <strong>Fix row</strong> to move data into the
              correct columns.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={repairAllMut.isPending}
                onClick={() => repairAllMut.mutate()}
              >
                <Wrench className="h-4 w-4" /> Fix all damaged rows
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, mobile, address" />
            </div>
            <div className="space-y-2">
              <Label>Date (YYYY-MM-DD)</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026-05-16" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* <Button variant="secondary" onClick={download}>
              <Download className="h-4 w-4" /> Download Excel
            </Button> */}
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => void hardRefreshAfterSave(qc)}
            >
              Refresh
            </Button>
            <span className="text-sm text-muted-foreground">
              {stats.families} rows · {stats.present} present / {stats.members} members
              {isFetching && !isPending && (
                <span className="ml-2 text-primary"> · Syncing…</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 font-semibold">Row</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Mobile</th>
                <th className="p-3 font-semibold">Present</th>
                <th className="p-3 font-semibold">Tokens</th>
                <th className="p-3 font-semibold">Time</th>
                <th className="p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isPending && (
                <tr>
                  <td colSpan={7} className="p-4 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {data.map((r) => (
                <tr
                  key={r.rowIndex}
                  className={
                    r.isCorrupt
                      ? 'border-b bg-amber-500/10 hover:bg-amber-500/15'
                      : 'border-b hover:bg-muted/30'
                  }
                >
                  <td className="p-3 text-xs font-mono text-muted-foreground">#{r.rowIndex}</td>
                  <td className="p-3 font-semibold">
                    {r.fullName}
                    {r.isCorrupt && (
                      <span className="ml-2 rounded bg-amber-600 px-1.5 py-0.5 text-xs text-white">
                        damaged
                      </span>
                    )}
                  </td>
                  <td className="p-3">{r.mobile}</td>
                  <td className="p-3">
                    {r.presentToday}/{r.totalFamily}
                  </td>
                  <td className="p-3 max-w-[11rem]">
                    {!r.isCorrupt && (() => {
                      const hint = tokenPendingPresentHint(r);
                      const { pendingAmongPresent } = getTokenStats(r);
                      return (
                        <div className="space-y-0.5 text-xs leading-snug">
                          <span
                            className={cn(
                              r.tokenGiven || r.members.some((m) => m.tokenGiven)
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-muted-foreground',
                            )}
                          >
                            {tokenSummaryLabel(r)}
                          </span>
                          {hint && (
                            <span
                              className={cn(
                                'block font-medium',
                                pendingAmongPresent > 0
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-green-700 dark:text-green-400',
                              )}
                            >
                              {hint}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {r.time ? new Date(r.time).toLocaleString() : '—'}
                  </td>
                  <td className="p-3 text-right">
                    {r.isCorrupt ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-1 text-amber-800"
                          disabled={repairMut.isPending}
                          onClick={() => repairMut.mutate(r.rowIndex)}
                        >
                          <Wrench className="h-4 w-4" /> Fix
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete Excel row #${r.rowIndex} (${r.fullName})? This cannot be undone.`,
                              )
                            ) {
                              deleteMut.mutate(r.rowIndex);
                            }
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const reg = recoverRegistration(r);
                            const slots = extraMemberSlotCount(reg.presentToday);
                            const members = reg.members.slice(0, slots).map((m) => ({ ...m }));
                            while (members.length < slots) {
                              members.push({ name: '', relation: '', tokenGiven: false });
                            }
                            setEdit({ ...reg, members });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm(`Delete row #${r.rowIndex} — ${r.fullName}?`)) {
                              deleteMut.mutate(r.rowIndex);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit registration</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <Input
                value={edit.fullName}
                onChange={(e) => setEdit({ ...edit, fullName: e.target.value })}
                placeholder="Full name"
              />
              <Input
                value={edit.mobile}
                onChange={(e) => setEdit({ ...edit, mobile: e.target.value })}
                placeholder="Mobile"
              />
              <Textarea
                value={edit.address}
                onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={edit.totalFamily}
                  onChange={(e) =>
                    setEdit({ ...edit, totalFamily: sanitizeCount(e.target.value, 1) })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={edit.presentToday}
                  onChange={(e) =>
                    setEdit({ ...edit, presentToday: sanitizeCount(e.target.value, 0) })
                  }
                />
              </div>
              <Textarea
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                rows={2}
                placeholder="Notes"
              />
              <AdminMemberTokens
                headName={edit.fullName}
                headTokenGiven={edit.tokenGiven}
                onHeadTokenChange={(tokenGiven) => setEdit({ ...edit, tokenGiven })}
                members={edit.members}
                onMembersChange={(members) => setEdit({ ...edit, members })}
                totalFamily={edit.totalFamily}
                presentToday={edit.presentToday}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

