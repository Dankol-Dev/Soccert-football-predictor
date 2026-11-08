import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useLiveFootballData } from '@/hooks/useLiveFootballData';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormGuide } from '@/components/teams/FormGuide';
import { TeamLogo } from '@/components/teams/TeamLogo';
import { ROUTES } from '@/constants';
import { formatDate, formatTime, classNames } from '@/utils';

export function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const {
    matches,
    predictions,
    loading,
    error,
    refreshError,
    predictionError,
    providerDataStale,
  } = useLiveFootballData();
  const match = matches.find((item) => item.id === matchId);
  const prediction = predictions.find((item) => item.matchId === matchId);

  if (loading) return <Spinner size="lg" label="Loading match…" className="py-24" />;

  if (error) {
    return (
      <div className="container-app py-24 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-neutral-400" />
        <p className="mt-3 text-sm text-neutral-600">Couldn't load match data.</p>
        <p className="mt-1 text-xs text-neutral-400">{error}</p>
        <Link to={ROUTES.PREDICTIONS} className="mt-6 inline-block">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to predictions</Button>
        </Link>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container-app py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Match not found</h1>
        <p className="mt-2 text-neutral-600">We couldn't find that fixture.</p>
        <Link to={ROUTES.PREDICTIONS} className="mt-6 inline-block">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to predictions</Button>
        </Link>
      </div>
    );
  }

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  return (
    <div className="bg-neutral-50">
      {/* Match header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-neutral-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary-400 blur-3xl" />
        </div>
        <div className="container-app relative z-10 py-10">
          <Link to={ROUTES.PREDICTIONS} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to predictions
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge tone="neutral" className="bg-white/10 text-white ring-white/20">{match.competition}</Badge>
            <Badge tone="neutral" className="bg-white/10 text-white ring-white/20">Matchday {match.matchday}</Badge>
            {isLive ? (
              <Badge tone="error" dot>{match.minute ? `Live · ${match.minute}'` : 'Live'}</Badge>
            ) : isFinished ? (
              <Badge tone="neutral" className="bg-white/10 text-white ring-white/20">Full time</Badge>
            ) : match.status === 'scheduled' ? (
              <Badge tone="primary" className="bg-primary-500/30 text-primary-100 ring-primary-400/30">Scheduled</Badge>
            ) : (
              <Badge tone={match.status === 'cancelled' ? 'error' : 'warning'}>
                {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
              </Badge>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <TeamLogo team={match.homeTeam} size="lg" />
              <p className="font-display text-lg font-bold text-white">{match.homeTeam.name}</p>
              <FormGuide form={match.homeTeam.form} />
            </div>

            <div>
              {(isLive || isFinished) ? (
                <p className="font-display text-5xl font-bold text-white">
                  {match.homeScore} <span className="text-primary-300">-</span> {match.awayScore}
                </p>
              ) : (
                <p className="font-display text-2xl font-bold text-primary-200">VS</p>
              )}
              <p className="mt-2 text-xs text-primary-200">{match.season}</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <TeamLogo team={match.awayTeam} size="lg" />
              <p className="font-display text-lg font-bold text-white">{match.awayTeam.name}</p>
              <FormGuide form={match.awayTeam.form} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-100">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDate(match.kickoff, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {formatTime(match.kickoff)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {match.venue}</span>
          </div>
        </div>
      </div>

      {/* Prediction + team comparison */}
      <div className="container-app py-10">
        {(providerDataStale || refreshError) && (
          <p className="mb-4 text-sm text-warning-700">Match data may be stale{refreshError ? `: ${refreshError}` : '.'}</p>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
          {prediction ? (
            <div className="lg:col-span-2">
              <PredictionCard prediction={prediction} match={match} />
            </div>
          ) : (
            <div className="lg:col-span-2 card rounded-2xl p-12 text-center">
              <p className="text-neutral-500">
                {predictionError
                  ? `Predictions unavailable: ${predictionError}`
                  : match.status === 'scheduled'
                  ? 'No model prediction is available for this match yet.'
                  : 'Predictions are available for scheduled matches only.'}
              </p>
            </div>
          )}

          {/* Side panel: team quick stats */}
          <div className="space-y-4">
            <div className="card rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-neutral-900">Team form</h3>
              {match.homeTeam.form.length || match.awayTeam.form.length ? (
                <div className="mt-4 space-y-3">
                  <StatRow label="Form (last 5)" home={sumPoints(match.homeTeam.form)} away={sumPoints(match.awayTeam.form)} homeLabel={`${match.homeTeam.shortName}`} awayLabel={`${match.awayTeam.shortName}`} />
                  <StatRow label="Wins in last 5" home={match.homeTeam.form.filter((r) => r === 'W').length} away={match.awayTeam.form.filter((r) => r === 'W').length} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">Recent form is not included in the current fixture feed.</p>
              )}
            </div>

            <div className="card rounded-2xl p-5">
              <h3 className="font-display text-base font-bold text-neutral-900">Match info</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Competition</dt><dd className="font-medium text-neutral-900">{match.competition}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Season</dt><dd className="font-medium text-neutral-900">{match.season}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Matchday</dt><dd className="font-medium text-neutral-900">{match.matchday}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Venue</dt><dd className="font-medium text-neutral-900">{match.venue}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function sumPoints(form: ('W' | 'D' | 'L')[]): number {
  return form.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
}

function StatRow({ label, home, away, homeLabel, awayLabel }: { label: string; home: number; away: number; homeLabel?: string; awayLabel?: string }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={classNames('font-semibold', home >= away ? 'text-neutral-900' : 'text-neutral-400')}>{homeLabel ? `${homeLabel} ${home}` : home}</span>
        <span className="text-neutral-500">{label}</span>
        <span className={classNames('font-semibold', away >= home ? 'text-neutral-900' : 'text-neutral-400')}>{awayLabel ? `${away} ${awayLabel}` : away}</span>
      </div>
      <div className="flex h-2 gap-1 overflow-hidden rounded-full">
        <div className="bg-primary-500 transition-all" style={{ width: `${homePct}%` }} />
        <div className="bg-success-500 transition-all" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}
