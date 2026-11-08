import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Zap, BarChart3, Target, AlertCircle } from 'lucide-react';
import { useLiveFootballData } from '@/hooks/useLiveFootballData';
import { MatchCard } from '@/components/matches/MatchCard';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { ROUTES, APP_NAME } from '@/constants';

export function HomePage() {
  const {
    matches,
    predictions,
    loading,
    error,
    refreshError,
    predictionError,
    providerDataStale,
  } = useLiveFootballData();
  const highest = [...predictions].sort(
    (a, b) => b.topOutcomeProbability - a.topOutcomeProbability
  )[0];
  const topMatch = highest && matches.find((match) => match.id === highest.matchId);
  const topPrediction = highest && topMatch
    ? { match: topMatch, prediction: highest }
    : null;

  const upcoming = matches.filter((m) => m.status === 'scheduled').slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary-400 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-accent-500 blur-3xl" />
        </div>
        <div className="container-app relative z-10 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="primary" className="border border-primary-400/30 bg-primary-500/20 text-primary-100 mb-6" dot>
              Soccert Live Predictions
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight text-white text-balance sm:text-5xl lg:text-6xl">
              Predict the game before it begins
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
              {APP_NAME} estimates goals from rolling home and away scoring records, then turns the score distribution into match probabilities.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={ROUTES.PREDICTIONS}>
                <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  View predictions
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="lg" variant="secondary">
                  Create free account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="container-app grid grid-cols-2 divide-x divide-neutral-200 py-8 md:grid-cols-4">
          {[
            { label: 'Fixtures loaded', value: matches.length.toString() },
            {
              label: 'Mean top outcome probability',
              value: predictions.length
                ? `${Math.round(predictions.reduce((total, prediction) => total + prediction.topOutcomeProbability, 0) / predictions.length)}%`
                : 'Unavailable',
            },
            { label: 'Leagues loaded', value: new Set(matches.map((match) => match.competition)).size.toString() },
            { label: 'Model version', value: predictions[0]?.modelVersion ?? 'Unavailable' },
          ].map((stat) => (
            <div key={stat.label} className="px-4 text-center">
              <p className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container-app py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-neutral-900">How it works</h2>
          <p className="mt-3 text-neutral-600">A transparent goal model, rolling backtests, and evidence-led calibration.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: BarChart3, title: 'Rolling goal rates', text: 'Recent home and away scoring records estimate each team’s expected goals.' },
            { icon: Target, title: 'Score distribution', text: 'A Poisson score model produces home, draw, and away probabilities.' },
            { icon: Zap, title: 'Calibration checks', text: 'Probability scaling is retained only when rolling holdouts show improved scores.' },
          ].map((feature) => (
            <div key={feature.title} className="card rounded-2xl p-6 text-center transition-all hover:shadow-card-hover">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <feature.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured prediction */}
      {topPrediction && (
        <section className="bg-neutral-50 py-20">
          <div className="container-app">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">Top pick today</h2>
                <p className="mt-1 text-sm text-neutral-600">Highest probability assigned to a single outcome.</p>
              </div>
              <Link to={ROUTES.PREDICTIONS} className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex sm:items-center sm:gap-1">
                All predictions <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mx-auto max-w-2xl">
              <PredictionCard prediction={topPrediction.prediction} match={topPrediction.match} />
            </div>
          </div>
        </section>
      )}

      {/* Upcoming matches */}
      <section className="container-app py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900">Upcoming fixtures</h2>
            <p className="mt-1 text-sm text-neutral-600">Matches with predictions ready to explore.</p>
          </div>
          <Link to={ROUTES.PREDICTIONS} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <Spinner size="lg" label="Loading fixtures…" className="py-16" />
        ) : error ? (
          <div className="card rounded-2xl py-16 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-600">Couldn't load live match data.</p>
            <p className="mt-1 text-xs text-neutral-400">{error}</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="card rounded-2xl py-16 text-center">
            <p className="text-sm text-neutral-500">No upcoming fixtures right now. Check back soon.</p>
          </div>
        ) : (
          <>
            {(providerDataStale || refreshError) && (
              <p className="mb-3 text-sm text-warning-700">
                Match data may be stale{refreshError ? `: ${refreshError}` : '.'}
              </p>
            )}
            {predictionError && <p className="mb-4 text-sm text-warning-700">Predictions unavailable: {predictionError}</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {upcoming.map((match) => (
                <MatchCard key={match.id} match={match} topOutcomeProbability={predictions.find((prediction) => prediction.matchId === match.id)?.topOutcomeProbability} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* CTA */}
      <section className="container-app pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 px-8 py-14 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-primary-200" />
          <h2 className="mt-4 font-display text-3xl font-bold text-white">Ready to predict smarter?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">
            Create an account to access your dashboard and profile settings.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg" variant="accent">Get started it's free</Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button size="lg" variant="secondary">I already have an account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
