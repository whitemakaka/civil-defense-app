import { useCallback, useEffect, useMemo, useRef } from 'react';

type IdleUnloadMode = 'bundle' | 'embedder' | 'all';

type IdleUnloadCallbacks = {
  onUnloadBundle: () => void;
  onUnloadEmbedder: () => void;
};

/**
 * Unloads the bundle and/or embedder after `timeout` seconds without activity.
 * The returned object is identity-stable while `timeout` and `mode` stay the
 * same; `callbacks` may be a new literal on every render (read through a ref).
 */
export function useIdleUnload(
  timeout: number | 'off',
  mode: IdleUnloadMode,
  callbacks: IdleUnloadCallbacks
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    if (timeout === 'off') return;

    lastActivityRef.current = Date.now();
    const timeoutMs = timeout * 1000;

    const scheduleCheck = (delayMs: number) => {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const idleMs = Date.now() - lastActivityRef.current;
        if (idleMs < timeoutMs) {
          scheduleCheck(timeoutMs - idleMs);
          return;
        }
        const { onUnloadBundle, onUnloadEmbedder } = callbacksRef.current;
        if (mode === 'bundle' || mode === 'all') onUnloadBundle();
        if (mode === 'embedder' || mode === 'all') onUnloadEmbedder();
      }, delayMs);
    };

    scheduleCheck(timeoutMs);
  }, [timeout, mode, clear]);

  const touch = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => clear, [clear]);

  return useMemo(() => ({ reset, clear, touch }), [reset, clear, touch]);
}
