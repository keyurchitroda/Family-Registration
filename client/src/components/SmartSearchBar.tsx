import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { searchRegistrations, type Registration } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

type Props = {
  onSelect: (r: Registration) => void;
  autoFocus?: boolean;
};

function memberSummary(r: Registration): string {
  if (r.members.length === 0) return 'Head only';
  const names = r.members
    .slice(0, 3)
    .map((m) => (m.relation ? `${m.name} (${m.relation})` : m.name))
    .join(', ');
  const more = r.members.length > 3 ? ` +${r.members.length - 3}` : '';
  return names + more;
}

export function SmartSearchBar({ onSelect, autoFocus }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounced = useDebounce(q, 180);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data = [], isFetching, isFetched } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchRegistrations(debounced),
    enabled: debounced.trim().length >= 1,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setOpen(debounced.trim().length >= 1 && (data.length > 0 || isFetching));
    setHighlight(0);
  }, [debounced, data.length, isFetching]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const pick = (r: Registration) => {
    onSelect(r);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="pl-10 text-lg"
          placeholder="Search name, mobile, address, or member name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => debounced.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || data.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, data.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter' && data[highlight]) {
              e.preventDefault();
              pick(data[highlight]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border bg-card shadow-lg">
          {data.length === 0 && isFetched && !isFetching && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No match - enter as new family below
            </li>
          )}
          {data.map((r, i) => (
            <li key={r.rowIndex}>
              <button
                type="button"
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  i === highlight ? 'bg-primary/10' : 'hover:bg-muted',
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(r)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{r.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.mobile} | {r.address}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{memberSummary(r)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/15 px-2 py-1 text-xs font-bold text-secondary">
                    <Users className="h-3.5 w-3.5" />
                    {r.presentToday}/{r.totalFamily}
                  </span>
                </div>
              </button>
            </li>
          ))}
          {isFetching && (
            <li className="px-4 py-2 text-sm text-muted-foreground">Searching...</li>
          )}
        </ul>
      )}
    </div>
  );
}
