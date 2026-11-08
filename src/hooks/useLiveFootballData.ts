import { useEffect, useRef, useState } from 'react';
import type { Match, Prediction } from '@/types';
import { getMatches, getPredictions } from '@/services/footballData';

const REFRESH_INTERVAL_MS = 90_000;

export function useLiveFootballData() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (requestInFlight.current) return;
      requestInFlight.current = true;
      try {
        const nextMatches = await getMatches();
        if (!active) return;
        setMatches(nextMatches);
        setLoading(false);
        setError(null);
        setRefreshError(null);

        try {
          const nextPredictions = await getPredictions(nextMatches);
          if (!active) return;
          setPredictions(nextPredictions);
          setPredictionError(null);
        } catch (reason) {
          if (active) {
            setPredictionError(
              reason instanceof Error ? reason.message : 'Prediction service unavailable'
            );
          }
        }
      } catch (reason) {
        if (!active) return;
        const message = reason instanceof Error ? reason.message : 'Failed to load match data';
        setRefreshError(message);
        if (!hasLoaded.current) setError(message);
      } finally {
        requestInFlight.current = false;
        if (active) {
          hasLoaded.current = true;
          setLoading(false);
        }
      }
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    matches,
    predictions,
    loading,
    error,
    refreshError,
    predictionError,
    providerDataStale: matches.some((match) => match.dataStale),
  };
}