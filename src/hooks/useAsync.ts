import { useCallback, useRef, useState } from 'react';
import type { ApiStatus } from '@/types';

/**
 * Generic async data hook that tracks loading / error / success state.
 * Use for one-off data fetches triggered by user action or on mount.
 */
export function useAsync<T>() {
  const [status, setStatus] = useState<ApiStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const run = useCallback(
    async (promise: Promise<T>) => {
      setStatus('loading');
      setError(null);
      try {
        const result = await promise;
        if (mountedRef.current) {
          setData(result);
          setStatus('success');
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : 'Something went wrong';
          setError(message);
          setStatus('error');
        }
        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return { status, data, error, run, reset };
}
