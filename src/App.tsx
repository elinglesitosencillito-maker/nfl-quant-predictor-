import { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, CloudDownload, TriangleAlert } from 'lucide-react';
import PredictorView from './components/PredictorView';
import { loadLeagueData } from './lib/dataLoader';
import type { LeagueData } from './lib/dataLoader';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LeagueData };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const fetchData = useCallback(() => {
    setState({ status: 'loading' });
    loadLeagueData()
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Error de red desconocido',
        }),
      );
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen gridlines">
      <header className="border-b border-line bg-panel/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-volt flex items-center justify-center">
              <span className="font-display text-pitch text-xl font-extrabold">G</span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide leading-none">
                GRIDIRON<span className="text-volt">/</span>QUANT
              </h1>
              <p className="text-[11px] font-mono text-muted leading-tight">
                Elo dinámico · Poisson NFL · Monte Carlo 10K
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-muted">
            <Database size={13} className="text-cyanline" />
            {state.status === 'ready' ? (
              <>
                <span>
                  nfelo wk{state.data.eloWeek} · nflverse {state.data.season} wk{state.data.throughWeek}
                </span>
                <span className="text-line">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-volt live-dot" />
                  datos en vivo
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ember live-dot" />
                conectando…
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <CloudDownload size={40} className="text-volt animate-bounce" />
            <div className="font-display text-2xl font-bold">Descargando datos de la semana…</div>
            <div className="font-mono text-xs text-muted text-center leading-relaxed">
              nfelo · elo_snapshot.csv (Elos vigentes + ajuste QB)
              <br />
              nflverse · games.csv (marcadores reales → forma reciente)
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="mx-auto max-w-lg rounded-xl border border-ember/40 bg-ember/5 p-8 text-center mt-20">
            <TriangleAlert size={36} className="text-ember mx-auto mb-3" />
            <div className="font-display text-2xl font-bold mb-2">
              No se pudieron cargar los datos
            </div>
            <p className="font-mono text-xs text-muted mb-1">
              Fuente: GitHub raw (nfelo / nflverse)
            </p>
            <p className="font-mono text-xs text-ember mb-5 break-all">{state.message}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-md bg-volt px-4 py-2.5 font-display text-lg font-bold text-pitch hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <PredictorView league={state.data} onRefresh={fetchData} />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 pt-2">
        <p className="font-mono text-[11px] text-muted/70">
          Datos en vivo del ecosistema nfelo (greerreNFL/nfelo · Elos y ajuste QB semanal) y
          nflverse (nfldata/games.csv · marcadores reales). Modelos: Elo (HFA +65, QB) · Poisson
          con números clave (3, 6, 7, 10, 14, 17, 20, 24) · Monte Carlo 10,000 iteraciones con
          eventos reales de la NFL y clima. Solo con fines analíticos.
        </p>
      </footer>
    </div>
  );
}
