import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun, UtensilsCrossed } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/register', label: 'Register' },
  { to: '/admin', label: 'Admin' },
];

export function AppLayout() {
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <UtensilsCrossed className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Samaj Dinner
            </p>
            <h1 className="truncate text-lg font-bold leading-tight">Family Registration</h1>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  pathname === l.to
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Button type="button" variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        <nav className="flex gap-1 border-t px-2 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold',
                pathname === l.to ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
