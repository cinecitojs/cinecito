// apps/web/src/hooks/useSupporter.ts
// Estado de supporter del usuario (recompensas cosméticas). Cacheado con React Query.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Supporter } from '../lib/supporterRewards';

export function useSupporter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.user?.guest);
  return useQuery<Supporter>({
    queryKey: ['supporter-me'],
    queryFn: () => supportApi.me().then((r) => r.data.supporter as Supporter),
    enabled: !!isAuthenticated && !isGuest,
    staleTime: 60_000,
  });
}

// Para refrescar tras conceder/cambiar (dev-grant, cambio de tema, anonimato).
export function useInvalidateSupporter() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['supporter-me'] });
}
