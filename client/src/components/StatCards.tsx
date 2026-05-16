import { Calendar, Users, UserCheck, UsersRound } from 'lucide-react';
import type { DashboardStats } from '../types';
import { cn } from '../lib/utils';

const cards: {
  key: keyof DashboardStats;
  label: string;
  icon: typeof Users;
  gradient: string;
}[] = [
  {
    key: 'totalRegisteredFamilies',
    label: 'Total families',
    icon: Users,
    gradient: 'from-indigo-600 to-indigo-500',
  },
  {
    key: 'totalMembers',
    label: 'Total members',
    icon: UsersRound,
    gradient: 'from-indigo-500 to-orange-500',
  },
  {
    key: 'totalPresentToday',
    label: 'Present today',
    icon: UserCheck,
    gradient: 'from-orange-500 to-orange-400',
  },
  {
    key: 'registrationsToday',
    label: 'Registered today',
    icon: Calendar,
    gradient: 'from-indigo-700 to-indigo-600',
  },
];

export function StatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, gradient }) => (
        <div
          key={key}
          className={cn(
            'rounded-xl bg-gradient-to-br p-5 text-white shadow-md transition-transform hover:-translate-y-0.5',
            gradient,
          )}
        >
          <div className="mb-2 flex items-center gap-2 opacity-95">
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <p className="text-4xl font-black tracking-tight">{stats[key].toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
