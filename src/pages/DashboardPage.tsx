import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Target, Trophy, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import type { StandingsRow } from '@/types';
import { getStandings } from '@/services/footballData';
import { useLiveFootballData } from '@/hooks/useLiveFootballData';
import { useAuth } from '@/context/AuthContext';
import { MatchCard } from '@/components/matches/MatchCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants';
import { initials } from '@/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const {
    matches,
    predictions,
    loading: liveLoading,
    error,
    refreshError,
    predictionError,
    providerDataStale,
  } = useLiveFootballData();
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(true);
  const [standingsError, setStandingsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getStandings()
      .then((data) => {
        if (active) setStandings(data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setStandingsError(reason instanceof Error ? reason.message : 'Failed to load standings');
        }
      })
      .finally(() => {
        if (active) setStandingsLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (liveLoading || standingsLoading) return <Spinner size="lg" label="Loading your dashboard…" className="py-24" />;

  if (error) {
    return (
      <div className="container-app py-24">
        <div className="card mx-auto max-w-md rounded-2xl py-16 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-3 text-sm text-neutral-600">Couldn't load your dashboard.</p>
          <p className="mt-1 text-xs text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  const upcoming = matches.filter((m) => m.status === 'scheduled').slice(0, 3);
  const topPicks = [...predictions].sort((a, b) => b.topOutcomeProbability - a.topOutcomeProbability).slice(0, 3);
  const topProbabilityByMatch = new Map(predictions.map((p) => [p.matchId, p.topOutcomeProbability]));
  const meanTopProbability = predictions.length
    ? Math.round(predictions.reduce((acc, p) => acc + p.topOutcomeProbability, 0) / predictions.length)
    : 0;

  return (
    <div className="bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-10">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-lg font-bold text-white">
              {user ? initials(user.name) : '?'}
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-neutral-900">
                Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
              </h1>
              <p className="mt-1 text-neutral-600">Here's your prediction overview.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, label: 'Predictions available', value: predictions.length, iconBg: 'bg-primary-50 text-primary-600' },
            { icon: TrendingUp, label: 'Mean top outcome probability', value: `${meanTopProbability}%`, iconBg: 'bg-primary-50 text-primary-600' },
            { icon: Activity, label: 'Live matches', value: matches.filter((m) => m.status === 'live').length, iconBg: 'bg-error-50 text-error-600' },
            { icon: Trophy, label: 'Leagues tracked', value: 4, iconBg: 'bg-accent-50 text-accent-600' },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Upcoming */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-neutral-900">Upcoming predictions</h2>
              <Link to={ROUTES.PREDICTIONS} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {(providerDataStale || refreshError) && (
              <p className="mb-3 text-sm text-warning-700">Match data may be stale{refreshError ? `: ${refreshError}` : '.'}</p>
            )}
            <div className="grid gap-4">
              {upcoming.map((match) => (
                <MatchCard key={match.id} match={match} topOutcomeProbability={topProbabilityByMatch.get(match.id)} />
              ))}
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Highest outcome probabilities</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {predictionError && <p className="text-sm text-warning-700">Predictions unavailable: {predictionError}</p>}
                {!predictionError && topPicks.length === 0 && <p className="text-sm text-neutral-500">No upcoming predictions available.</p>}
                {topPicks.map((p) => {
                  const match = matches.find((m) => m.id === p.matchId);
                  return (
                    <Link key={p.id} to={`${ROUTES.HOME}matches/${p.matchId}`} className="block rounded-xl p-3 transition-colors hover:bg-neutral-50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-neutral-900">
                          {match ? `${match.homeTeam.shortName} vs ${match.awayTeam.shortName}` : 'Match'}
                        </p>
                        <Badge tone="neutral">
                          {p.topOutcomeProbability}%
                        </Badge>
                      </div>
                      <ProgressBar value={p.topOutcomeProbability} tone="primary" size="sm" className="mt-2" />
                    </Link>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Premier League standings</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {standingsError && <p className="text-sm text-warning-700">Standings unavailable: {standingsError}</p>}
                {standings.slice(0, 5).map((row) => (
                  <div key={row.team.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-neutral-400">{row.position}</span>
                    <span aria-hidden>{row.team.logo}</span>
                    <span className="flex-1 truncate font-medium text-neutral-900">{row.team.name}</span>
                    <span className="font-semibold text-neutral-700">{row.points} pts</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
