import { useEffect } from 'react';
import type { FamilyMember } from '../types';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { getTokenStatsFromFields } from '../utils/tokens';
import { extraMemberSlotCount } from '../utils/presentMembers';

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
  const slotCount = extraMemberSlotCount(presentToday);
  const { given, pendingAmongPresent } = getTokenStatsFromFields(
    headTokenGiven,
    members,
    totalFamily,
    presentToday,
  );

  useEffect(() => {
    const target = slotCount;
    if (members.length === target) return;
    const next = [...members.slice(0, target)];
    while (next.length < target) next.push(emptyMember());
    onMembersChange(next);
  }, [presentToday, slotCount, members.length, onMembersChange]);

  const updateMember = (index: number, patch: Partial<FamilyMember>) => {
    onMembersChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const toggleMember = (index: number) => {
    updateMember(index, { tokenGiven: !members[index]?.tokenGiven });
  };

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-muted/30 p-4">
      <div>
        <p className="text-sm font-bold text-primary">Physical token tracking</p>
        <p className="text-xs text-muted-foreground">
          One row per person present today — family head first, then each member.
        </p>
        <p className="mt-2 text-xs font-medium">
          Present {presentToday}/{totalFamily} · Tokens {given}/{presentToday}
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
        <Label>Family list — head &amp; members ({presentToday} present)</Label>

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
              Family head · 1 of {presentToday}
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

        {slotCount === 0 && presentToday <= 1 && (
          <p className="text-sm text-muted-foreground">Only the family head is present today.</p>
        )}

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
                    />
                    <span className="text-xs text-muted-foreground">
                      Present member {i + 2} of {presentToday}
                    </span>
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
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
