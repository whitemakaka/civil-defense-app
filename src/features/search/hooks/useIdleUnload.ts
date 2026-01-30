import { useCallback, useRef } from 'react';

type IdleUnloadMode = 'bundle' | 'embedder' | 'all';

type IdleUnloadCallbacks = {
  onUnloadBundle: () => void;
  onUnloadEmbedder: () => void;
};

export function useIdleUnload(
  timeout: number | 'off',
  mode: IdleUnloadMode,
  callbacks: IdleUnloadCallbacks
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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

    const scheduleCheck = () => {
      timerRef.current = setTimeout(() => {
        const idleMs = Date.now() - lastActivityRef.current;
        if (idleMs < timeoutMs) {
          scheduleCheck();
          return;
        }
        if (mode === 'bundle' || mode === 'all') callbacks.onUnloadBundle();
        if (mode === 'embedder' || mode === 'all') callbacks.onUnloadEmbedder();
      }, timeoutMs);
    };

    scheduleCheck();
  }, [timeout, mode, callbacks, clear]);

  const touch = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  return { reset, clear, touch };
}
