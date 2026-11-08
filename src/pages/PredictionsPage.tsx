import { useMemo, useState } from 'react';
import { Filter, Search, AlertCircle, SlidersHorizontal } from 'lucide-react';
import type { Competition } from '@/types';
import { useLiveFootballData } from '@/hooks/useLiveFootballData';
import { MatchCard } from '@/components/matches/MatchCard';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { COMPETITIONS } from '@/constants';
import { classNames } from '@/utils';

const PREDICTION_LIMITS = [5, 10, 15, 20, 50] as const;

export function PredictionsPage() {
  const {
    matches,
    predictions,
    loading,
    error,
    refreshError,
    predictionError,
    providerDataStale,
  } = useLiveFootballData();
  const [query, setQuery] = useState('');
  const [activeComp, setActiveComp] = useState<Competition | 'all'>('all');
  const [predictionLimit, setPredictionLimit] = useState<number>(10);

  const topProbabilityByMatch = useMemo(() => {
    const map = new Map<string, number>();
    predictions.forEach((p) => map.set(p.matchId, p.topOutcomeProbability));
    return map;
  }, [predictions]);

  const filtered = useMemo(() => {
    return matches
      .filter((m) => m.status === 'scheduled' || m.status === 'live')
      .filter((m) => activeComp === 'all' || m.competition === activeComp)
      .filter((m) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          m.homeTeam.name.toLowerCase().includes(q) ||
          m.awayTeam.name.toLowerCase().includes(q) ||
          m.competition.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }, [matches, activeComp, query]);

  const visibleMatches = useMemo(() => {
    return filtered.slice(0, predictionLimit);
  }, [filtered, predictionLimit]);

  return (
    <div className="bg-neutral-50">
      {/* Page header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-10">
          <h1 className="font-display text-3xl font-bold text-neutral-900">Predictions</h1>
          <p className="mt-2 text-neutral-600">Browse upcoming matches and their predictions.</p>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500">
              <Filter className="h-4 w-4" /> Filter:
            </span>
            <button
              onClick={() => setActiveComp('all')}
              className={classNames(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeComp === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100'
              )}
            >
              All
            </button>
            {COMPETITIONS.map((comp) => (
              <button
                key={comp}
                onClick={() => setActiveComp(comp)}
                className={classNames(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeComp === comp ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100'
                )}
              >
                {comp}
              </button>
            ))}
          </div>
          <div className="lg:w-72">
            <Input
              placeholder="Search teams or leagues…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Prediction limit selector */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">Predictions to show</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PREDICTION_LIMITS.map((limit) => (
              <button
                key={limit}
                onClick={() => setPredictionLimit(limit)}
                className={classNames(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  predictionLimit === limit
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {limit}
              </button>
            ))}
            <button
              onClick={() => setPredictionLimit(filtered.length)}
              className={classNames(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                predictionLimit === filtered.length
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              All
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <Spinner size="lg" label="Loading predictions…" className="py-20" />
        ) : error ? (
          <div className="card rounded-2xl py-20 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-600">Couldn't load live match data.</p>
            <p className="mt-1 text-xs text-neutral-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card rounded-2xl py-20 text-center">
            <p className="text-neutral-500">No matches found for your filters.</p>
            <button
              onClick={() => { setQuery(''); setActiveComp('all'); }}
              className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {(providerDataStale || refreshError) && (
              <p className="mb-3 text-sm text-warning-700">
                Match data may be stale{refreshError ? `: ${refreshError}` : '.'}
              </p>
            )}
            {predictionError && <p className="mb-4 text-sm text-warning-700">Predictions unavailable: {predictionError}</p>}
            <div className="mb-4 flex items-center justify-between">
              <Badge tone="neutral">
                Showing {visibleMatches.length} of {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleMatches.map((match) => (
                <MatchCard key={match.id} match={match} topOutcomeProbability={topProbabilityByMatch.get(match.id)} />
              ))}
            </div>
            {visibleMatches.length < filtered.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setPredictionLimit(filtered.length)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Show all {filtered.length} matches
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
