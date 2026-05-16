import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { fetchStats } from '../services/api';
import { StatCards } from '../components/StatCards';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export function DashboardPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">Live dashboard</h2>
          <p className="text-muted-foreground">Counts refresh every few seconds from local Excel.</p>
        </div>
        <Button asChild size="lg" variant="secondary" className="shrink-0">
          <Link to="/register">
            Fast register <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      {isError && (
        <p className="text-red-600">
          Could not load stats.{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}
      {data && <StatCards stats={data} />}
    </div>
  );
}
