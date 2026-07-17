import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wind, Thermometer, UserX, Trophy, Crosshair, Sigma,
  ChevronsUpDown, Braces, Copy, Check, RefreshCw,
} from 'lucide-react';
import type { Team } from '../lib/teams';
import type { LeagueData } from '../lib/dataLoader';
import { predecirPartido } from '../lib/engine';
import type { Prediction } from '../lib/engine';
import MarginChart from './MarginChart';
import ScoreDistChart from './ScoreDistChart';

function TeamSelect({
  label, value, onChange, exclude, teams,
}: { label: string; value: string; onChange: (v: string) => void; exclude: string; teams: Team[] }) {
  return (
    <div className="flex-1 min-w-[150px]">
      <label className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</label>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-line bg-panel2 px-3 py-2.5 pr-8 font-display text-lg font-semibold tracking-wide outline-none focus:border-volt/60"
        >
          {teams.filter((t) => t.abbr !== exclude)
            .sort((a, b) => a.city.localeCompare(b.city))
            .map((t) => (
              <option key={t.abbr} value={t.abbr}>
                {t.city} {t.name} ({t.abbr})
              </option>
            ))}
        </select>
        <ChevronsUpDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

function TeamBadge({ team, side }: { team: Team; side: 'LOCAL' | 'VISITA' }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-lg flex items-center justify-center font-display text-lg font-extrabold shrink-0"
        style={{ background: team.color, color: '#fff', boxShadow: `0 0 0 2px ${team.color2}55` }}
      >
        {team.abbr}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{side}</div>
        <div className="font-display text-xl font-bold leading-tight truncate">
          {team.city} {team.name}
        </div>
        <div className="font-mono text-[11px] text-muted truncate">
          Elo {team.elo.toFixed(0)}{team.qbAdj !== 0 && ` (QB ${team.qbAdj > 0 ? '+' : ''}${team.qbAdj.toFixed(0)})`} · {team.qb}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, accent }: {
  title: string; value: string; sub: string; accent?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</div>
      <div className="font-display text-3xl font-extrabold mt-1" style={{ color: accent ?? 'var(--color-ink)' }}>
        {value}
      </div>
      <div className="font-mono text-[11px] text-muted mt-1">{sub}</div>
    </div>
  );
}

export default function PredictorView({
  league, onRefresh,
}: { league: LeagueData; onRefresh: () => void }) {
  const teams = league.teams;
  const [homeAbbr, setHomeAbbr] = useState('KC');
  const [awayAbbr, setAwayAbbr] = useState('BUF');
  const [wind, setWind] = useState(8);
  const [temp, setTemp] = useState(12);
  const [homeQBOut, setHomeQBOut] = useState(false);
  const [awayQBOut, setAwayQBOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const home = teams.find((t) => t.abbr === homeAbbr) ?? teams[0];
  const away = teams.find((t) => t.abbr === awayAbbr) ?? teams[1];

  const pred: Prediction = useMemo(
    () => predecirPartido(home, away, { windMph: wind, tempC: temp, homeQBOut, awayQBOut }, league.leagueAvg),
    [home, away, wind, temp, homeQBOut, awayQBOut, league.leagueAvg],
  );

  const winner = pred.verdict === 'home' ? home : away;
  const winnerPct = pred.verdictPct;

  const jsonOutput = useMemo(() => JSON.stringify({
    matchup: { home: home.abbr, away: away.abbr },
    inputs: {
      elo_home_adjusted: +pred.eloHomeAdj.toFixed(1),
      elo_away_adjusted: +pred.eloAwayAdj.toFixed(1),
      elo_diff: +pred.eloDiff.toFixed(1),
      lambda_home: +pred.lambda.toFixed(2),
      mu_away: +pred.mu.toFixed(2),
      wind_mph: wind, temp_c: temp,
      home_qb_out: homeQBOut, away_qb_out: awayQBOut,
    },
    moneyline_1x2: {
      home_win_prob: +(pred.mc.homeWinPct / 100).toFixed(4),
      away_win_prob: +(pred.mc.awayWinPct / 100).toFixed(4),
      tie_prob: +(pred.mc.tiePct / 100).toFixed(4),
      fair_decimal_odds: {
        home: +pred.fairMLHome.toFixed(2),
        away: +pred.fairMLAway.toFixed(2),
      },
    },
    spread: {
      line: pred.spreadLabel,
      home_line: pred.spreadLine,
      projected_margin_home: +pred.mc.medianMargin.toFixed(2),
      home_cover_prob: +(pred.mc.coverHomePct / 100).toFixed(4),
    },
    total: {
      line: pred.totalLine,
      projected_total: +pred.mc.meanTotal.toFixed(2),
      over_prob: +(pred.mc.overPct / 100).toFixed(4),
      under_prob: +(pred.mc.underPct / 100).toFixed(4),
    },
    verdict: {
      final: `VEREDICTO FINAL: ${winner.abbr} gana (${winnerPct.toFixed(1)}% de probabilidad). Línea sugerida: ${pred.spreadLabel} | Total: ${pred.totalLine}`,
      winner: winner.abbr,
      win_probability_pct: +winnerPct.toFixed(1),
    },
    meta: {
      iterations: pred.mc.iterations,
      models: ['elo_dynamic', 'poisson_key_numbers', 'monte_carlo'],
      data_sources: {
        elo: `greerreNFL/nfelo · elo_snapshot.csv · wk${league.eloWeek}`,
        form: `nflverse/nfldata · games.csv · ${league.season} wk${league.throughWeek}`,
        league_avg_ppg: +league.leagueAvg.toFixed(2),
        fetched_at: league.fetchedAt,
      },
    },
  }, null, 2), [pred, home, away, wind, temp, homeQBOut, awayQBOut, winner, winnerPct, league]);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-volt live-dot" />
        <span className="font-mono text-[11px] text-muted">
          Datos en vivo · nfelo Elos wk{league.eloWeek} · nflverse forma {league.season} wk{league.throughWeek} · media liga {league.leagueAvg.toFixed(1)} pts
        </span>
        <button
          onClick={onRefresh}
          className="ml-auto flex items-center gap-1.5 rounded border border-line bg-panel2 px-2 py-1 font-mono text-[10px] text-muted hover:text-ink transition-colors"
        >
          <RefreshCw size={11} /> Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap gap-4">
          <TeamSelect label="Equipo Local" value={homeAbbr} onChange={setHomeAbbr} exclude={awayAbbr} teams={teams} />
          <TeamSelect label="Equipo Visitante" value={awayAbbr} onChange={setAwayAbbr} exclude={homeAbbr} teams={teams} />

          <div className="flex-1 min-w-[170px]">
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted flex items-center gap-1.5">
              <Wind size={12} /> Viento: <span className={wind > 15 ? 'text-ember font-semibold' : 'text-ink'}>{wind} mph</span>
            </label>
            <input
              type="range" min={0} max={35} value={wind}
              onChange={(e) => setWind(+e.target.value)}
              className="mt-3 w-full accent-[#c9f73a]"
            />
            {wind > 15 && <div className="font-mono text-[10px] text-ember mt-0.5">λ, μ −12% · varianza aérea +18%</div>}
          </div>

          <div className="flex-1 min-w-[170px]">
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted flex items-center gap-1.5">
              <Thermometer size={12} /> Temperatura: <span className={temp < 0 ? 'text-cyanline font-semibold' : 'text-ink'}>{temp}°C</span>
            </label>
            <input
              type="range" min={-20} max={38} value={temp}
              onChange={(e) => setTemp(+e.target.value)}
              className="mt-3 w-full accent-[#45d6e8]"
            />
            {temp < 0 && <div className="font-mono text-[10px] text-cyanline mt-0.5">Sesgo a juego terrestre activado</div>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: `${home.qb} (${home.abbr}) OUT`, val: homeQBOut, set: setHomeQBOut, pen: pred.qbPenaltyHome },
            { label: `${away.qb} (${away.abbr}) OUT`, val: awayQBOut, set: setAwayQBOut, pen: pred.qbPenaltyAway },
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => q.set(!q.val)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs transition-colors ${
                q.val
                  ? 'border-ember/60 bg-ember/10 text-ember'
                  : 'border-line bg-panel2 text-muted hover:text-ink'
              }`}
            >
              <UserX size={13} />
              {q.label}
              {q.val && <span className="font-semibold">−{q.pen.toFixed(0)} Elo</span>}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={`${homeAbbr}-${awayAbbr}-${wind}-${temp}-${homeQBOut}-${awayQBOut}`}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-volt/30 bg-gradient-to-br from-panel to-panel2 p-5 relative overflow-hidden"
      >
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-[0.06] pointer-events-none"
          style={{ background: `linear-gradient(105deg, transparent 30%, ${winner.color} 100%)` }} />
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <TeamBadge team={home} side="LOCAL" />
            <div className="font-display text-2xl font-extrabold text-muted px-1">VS</div>
            <TeamBadge team={away} side="VISITA" />
          </div>
          <div className="lg:text-right">
            <div className="flex lg:justify-end items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-volt">
              <Trophy size={12} /> Veredicto final · {pred.mc.iterations.toLocaleString()} sims
            </div>
            <div className="font-display text-4xl sm:text-5xl font-extrabold mt-1 leading-none">
              {winner.abbr} <span className="text-volt">{winnerPct.toFixed(1)}%</span>
            </div>
            <div className="font-mono text-xs text-muted mt-1.5">
              {winner.city} {winner.name} gana · momio justo {(pred.verdict === 'home' ? pred.fairMLHome : pred.fairMLAway).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex h-3.5 rounded-full overflow-hidden border border-line">
            <div className="h-full transition-all duration-500" style={{ width: `${pred.mc.homeWinPct}%`, background: home.color }} />
            <div className="h-full bg-panel2 transition-all duration-500" style={{ width: `${pred.mc.tiePct}%` }} />
            <div className="h-full transition-all duration-500" style={{ width: `${pred.mc.awayWinPct}%`, background: away.color }} />
          </div>
          <div className="flex justify-between font-mono text-[11px] text-muted mt-1.5">
            <span>{home.abbr} {pred.mc.homeWinPct.toFixed(1)}%</span>
            <span>Empate {pred.mc.tiePct.toFixed(1)}%</span>
            <span>{away.abbr} {pred.mc.awayWinPct.toFixed(1)}%</span>
          </div>
        </div>

        {pred.weatherNotes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pred.weatherNotes.map((n, i) => (
              <span key={i} className="rounded border border-ember/40 bg-ember/10 px-2 py-1 font-mono text-[10px] text-ember">
                {n}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Spread proyectado"
          value={pred.spreadLabel}
          sub={`Cobertura ${pred.spreadLine < 0 ? home.abbr : away.abbr}: ${(pred.spreadLine < 0 ? pred.mc.coverHomePct : pred.mc.coverAwayPct).toFixed(1)}%`}
          accent="#c9f73a"
        />
        <StatCard
          title="Total (Over/Under)"
          value={`${pred.totalLine}`}
          sub={`Over ${pred.mc.overPct.toFixed(1)}% · Under ${pred.mc.underPct.toFixed(1)}%`}
          accent="#45d6e8"
        />
        <StatCard
          title="Marcador esperado"
          value={`${pred.mc.meanHome.toFixed(1)}–${pred.mc.meanAway.toFixed(1)}`}
          sub={`λ=${pred.lambda.toFixed(2)} · μ=${pred.mu.toFixed(2)}`}
        />
        <StatCard
          title="Elo ajustado (d)"
          value={`${pred.eloDiff >= 0 ? '+' : ''}${pred.eloDiff.toFixed(0)}`}
          sub={`E(local) = ${(pred.eloExpectancyHome * 100).toFixed(1)}% · HFA +65`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Crosshair size={16} className="text-volt" />
            Distribución de márgenes (Monte Carlo)
          </div>
          <p className="font-mono text-[11px] text-muted mb-3">
            10,000 iteraciones · picos visibles en números clave ±3, ±7
          </p>
          <MarginChart data={pred.mc.marginHist} homeColor={home.color} awayColor={away.color} spread={-pred.spreadLine} />
        </div>

        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Sigma size={16} className="text-cyanline" />
            Poisson ajustada por números clave
          </div>
          <p className="font-mono text-[11px] text-muted mb-3">
            pmf(s) × w(s) · realza 3, 6, 7, 10, 14, 17, 20, 24 · aplasta 1, 4, 5…
          </p>
          <ScoreDistChart
            homeDist={pred.homeDist} awayDist={pred.awayDist}
            homeAbbr={home.abbr} awayAbbr={away.abbr}
            homeColor={home.color2 === '#FFFFFF' ? home.color : home.color2}
            awayColor={away.color}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-line bg-panel p-4">
          <div className="font-display text-lg font-bold mb-3">Marcadores más probables</div>
          <div className="space-y-2">
            {pred.mc.topScores.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="font-mono text-sm w-20 shrink-0">
                  {s.home}<span className="text-muted"> – </span>{s.away}
                </div>
                <div className="flex-1 h-2 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.pct / pred.mc.topScores[0].pct) * 100}%`,
                      background: s.home > s.away ? home.color : s.home < s.away ? away.color : '#7d8aa3',
                    }}
                  />
                </div>
                <div className="font-mono text-xs text-muted w-12 text-right">{s.pct.toFixed(2)}%</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-line bg-panel2 p-3 font-mono text-[11px] text-muted leading-relaxed">
            Cada marcador se construye con eventos reales: TD (6) + XP (94.5%) o conversión de 2
            (8% × 48%), FG (3), safety. Los empates se resuelven en OT vía expectativa Elo.
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <Braces size={16} className="text-volt" />
              Salida JSON · predecir_partido(&quot;{home.abbr}&quot;, &quot;{away.abbr}&quot;)
            </div>
            <button
              onClick={copyJson}
              className="flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 py-1.5 font-mono text-[11px] text-muted hover:text-ink transition-colors"
            >
              {copied ? <Check size={12} className="text-volt" /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre className="scroll-slim max-h-[430px] overflow-auto rounded-md border border-line bg-pitch p-3 font-mono text-[11.5px] leading-relaxed text-cyanline/90">
            {jsonOutput}
          </pre>
        </div>
      </div>
    </div>
  );
}
