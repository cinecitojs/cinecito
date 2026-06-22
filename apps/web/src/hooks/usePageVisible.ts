// apps/web/src/hooks/usePageVisible.ts
// true mientras la pestaña/ventana está visible. Sirve para pausar trabajo caro
// (decodificar video remoto, subir video propio en alta) cuando el usuario no mira.
import { useEffect, useState } from 'react';

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden');

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}
