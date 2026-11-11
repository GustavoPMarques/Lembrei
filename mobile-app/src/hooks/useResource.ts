import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [state, setState] = useState<{ data: T | null; error: string; source: typeof loader | null; version: number }>({ data: null, error: '', source: null, version: -1 });
  const [counter, setCounter] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const version = ++generation.current;
    loader(controller.signal).then((result) => {
      if (!controller.signal.aborted && generation.current === version) setState({ data: result, error: '', source: loader, version: counter });
    }).catch((e) => {
      if (!controller.signal.aborted && generation.current === version) setState({ data: null, error: e instanceof Error ? e.message : 'Não foi possível carregar os dados.', source: loader, version: counter });
    });
    return () => controller.abort();
  }, [loader, enabled, counter]);
  const reload = useCallback(() => setCounter((c) => c + 1), []);
  const current = state.source === loader && state.version === counter;
  return { data: enabled && current ? state.data : null, loading: enabled && !current, error: enabled && current ? state.error : '', reload };
}
