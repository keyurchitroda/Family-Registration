import { Plus, Trash2 } from 'lucide-react';
import type { FamilyMember } from '../types';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { getTokenStatsFromFields } from '../utils/tokens';

type Props = {
  headName: string;
  headTokenGiven: boolean;
  onHeadTokenChange: (v: boolean) => void;
  members: FamilyMember[];
  onMembersChange: (members: FamilyMember[]) => void;
  totalFamily: number;
  presentToday: number;
};

function emptyMember(): FamilyMember {
  return { name: '', relation: '', tokenGiven: false };
}

export function AdminMemberTokens({
  headName,
  headTokenGiven,
  onHeadTokenChange,
  members,
  onMembersChange,
  totalFamily,
  presentToday,
}: Props) {
  const { given, totalFamily: total, pendingAmongPresent, notListed: missing } =
    getTokenStatsFromFields(headTokenGiven, members, totalFamily, presentToday);

  const updateMember = (index: number, patch: Partial<FamilyMember>) => {
    onMembersChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const toggleMember = (index: number) => {
    updateMember(index, { tokenGiven: !members[index]?.tokenGiven });
  };

  const removeMember = (index: number) => {
    onMembersChange(members.filter((_, i) => i !== index));
  };

  const addMember = () => {
    onMembersChange([...members, emptyMember()]);
  };

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-muted/30 p-4">
      <div>
        <p className="text-sm font-bold text-primary">Physical token tracking</p>
        <p className="text-xs text-muted-foreground">
          Mark each person when their dinner token is handed out — family head first, then each
          member one by one.
        </p>
        <p className="mt-2 text-xs font-medium">
          Present {presentToday}/{totalFamily} · Tokens {given}/{total}
        </p>
        {presentToday > 0 && (
          <p
            className={cn(
              'mt-1 text-xs font-semibold',
              pendingAmongPresent > 0
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-green-700 dark:text-green-400',
            )}
          >
            {pendingAmongPresent > 0
              ? `${pendingAmongPresent} of ${presentToday} present — token still pending`
              : `All ${presentToday} present have received a token`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Family list — head &amp; members</Label>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
            headTokenGiven ? 'border-green-500/40 bg-green-500/10' : 'bg-card',
            'border-primary/30 bg-primary/5',
          )}
        >
          <input
            type="checkbox"
            className="h-6 w-6 shrink-0 rounded accent-primary"
            checked={headTokenGiven}
            onChange={(e) => onHeadTokenChange(e.target.checked)}
          />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">{headName}</span>
            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
              Family head
            </span>
          </div>
          <span
            className={cn(
              'shrink-0 text-xs font-bold uppercase',
              headTokenGiven ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            {headTokenGiven ? 'Given' : 'Pending'}
          </span>
        </label>

        {members.length > 0 && (
          <ul className="ml-3 space-y-2 border-l-2 border-muted-foreground/25 pl-3 sm:ml-5 sm:pl-4">
            {members.map((m, i) => (
              <li key={i}>
                <div
                  className={cn(
                    'rounded-lg border p-3',
                    m.tokenGiven ? 'border-green-500/40 bg-green-500/10' : 'bg-card',
                  )}
                >
                  <label className="mb-2 flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 rounded accent-secondary"
                      checked={Boolean(m.tokenGiven)}
                      onChange={() => toggleMember(i)}
                      disabled={!m.name.trim()}
                      title={!m.name.trim() ? 'Enter name first' : undefined}
                    />
                    <span className="text-xs text-muted-foreground">Member {i + 1}</span>
                    <span
                      className={cn(
                        'ml-auto text-xs font-bold uppercase',
                        m.tokenGiven ? 'text-green-700' : 'text-muted-foreground',
                      )}
                    >
                      {m.tokenGiven ? 'Given' : 'Pending'}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={m.name}
                      onChange={(e) => updateMember(i, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input
                      className="flex-1"
                      value={m.relation || ''}
                      onChange={(e) => updateMember(i, { relation: e.target.value })}
                      placeholder="Relation"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-600"
                      onClick={() => removeMember(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {missing > 0 && (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {missing} more on file (total family {totalFamily}) — use Add family member for each
            person.
          </p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addMember}>
          <Plus className="h-4 w-4" /> Add family member
        </Button>
      </div>
    </div>
  );
}
