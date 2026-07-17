/**
 * dataLoader.ts — Carga DINÁMICA de datos desde el ecosistema NFELO / nflverse.
 * 1. greerreNFL/nfelo → elo_snapshot.csv (Elos vigentes + ajuste QB semanal)
 * 2. nflverse/nfldata → games.csv (marcadores reales → forma últimas 4 semanas)
 */

import { TEAM_META } from './teams';
import type { Team } from './teams';

const NFELO_URL =
  'https://raw.githubusercontent.com/greerreNFL/nfelo/main/output_data/elo_snapshot.csv';
const GAMES_URL =
  'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv';

const REMAP: Record<string, string> = { OAK: 'LV', SD: 'LAC', STL: 'LAR', LA: 'LAR' };
const fix = (abbr: string) => REMAP[abbr] ?? abbr;

const FORM_WEIGHTS = [0.4, 0.28, 0.19, 0.13];

export interface LeagueData {
  teams: Team[];
  leagueAvg: number;
  season: number;
  throughWeek: number;
  eloWeek: number;
  fetchedAt: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

interface GameRow {
  season: number; week: number;
  home: string; away: string;
  hs: number; as: number;
  homeQB: string; awayQB: string;
}

export async function loadLeagueData(): Promise<LeagueData> {
  const [eloRes, gamesRes] = await Promise.all([
    fetch(NFELO_URL, { cache: 'no-store' }),
    fetch(GAMES_URL, { cache: 'no-store' }),
  ]);
  if (!eloRes.ok) throw new Error(`nfelo elo_snapshot: HTTP ${eloRes.status}`);
  if (!gamesRes.ok) throw new Error(`nflverse games.csv: HTTP ${gamesRes.status}`);

  const [eloText, gamesText] = await Promise.all([eloRes.text(), gamesRes.text()]);

  const eloRows = parseCSV(eloText);
  const eh = eloRows[0];
  const iTeam = eh.indexOf('team');
  const iBase = eh.indexOf('nfelo_base');
  const iQbAdj = eh.indexOf('qb_adj');
  const iSeason = eh.indexOf('season');
  const iWeek = eh.indexOf('week');
  if (iTeam < 0 || iBase < 0) throw new Error('Formato inesperado en elo_snapshot.csv');

  const eloMap = new Map<string, { elo: number; qbAdj: number }>();
  let eloSeason = 0, eloWeek = 0;
  for (const r of eloRows.slice(1)) {
    if (r.length < eh.length) continue;
    const abbr = fix(r[iTeam]);
    eloMap.set(abbr, { elo: +r[iBase], qbAdj: +(r[iQbAdj] ?? 0) });
    eloSeason = Math.max(eloSeason, +r[iSeason] || 0);
    eloWeek = Math.max(eloWeek, +r[iWeek] || 0);
  }

  const gRows = parseCSV(gamesText);
  const gh = gRows[0];
  const gi = (name: string) => gh.indexOf(name);
  const [giSea, giWk, giHT, giAT, giHS, giAS, giHQB, giAQB] = [
    gi('season'), gi('week'), gi('home_team'), gi('away_team'),
    gi('home_score'), gi('away_score'), gi('home_qb_name'), gi('away_qb_name'),
  ];
  if (giSea < 0 || giHS < 0) throw new Error('Formato inesperado en games.csv');

  const games: GameRow[] = [];
  let maxSeason = 0;
  for (const r of gRows.slice(1)) {
    if (r.length < gh.length) continue;
    const hs = r[giHS], as = r[giAS];
    if (hs === '' || as === '') continue;
    const season = +r[giSea];
    if (season < 2020) continue;
    maxSeason = Math.max(maxSeason, season);
    games.push({
      season, week: +r[giWk],
      home: fix(r[giHT]), away: fix(r[giAT]),
      hs: +hs, as: +as,
      homeQB: r[giHQB] || '—', awayQB: r[giAQB] || '—',
    });
  }
  const seasonGames = games.filter((g) => g.season === maxSeason);
  const throughWeek = Math.max(...seasonGames.map((g) => g.week));

  const formOf = (abbr: string): { ppg: number; papg: number; qb: string } => {
    const played = seasonGames
      .filter((g) => g.home === abbr || g.away === abbr)
      .sort((a, b) => b.week - a.week)
      .slice(0, 4);
    if (!played.length) return { ppg: 21, papg: 21, qb: '—' };
    let pf = 0, pa = 0, wSum = 0;
    played.forEach((g, i) => {
      const w = FORM_WEIGHTS[i] ?? FORM_WEIGHTS[FORM_WEIGHTS.length - 1];
      const scored = g.home === abbr ? g.hs : g.as;
      const allowed = g.home === abbr ? g.as : g.hs;
      pf += scored * w; pa += allowed * w; wSum += w;
    });
    const last = played[0];
    return {
      ppg: pf / wSum,
      papg: pa / wSum,
      qb: last.home === abbr ? last.homeQB : last.awayQB,
    };
  };

  const teams: Team[] = TEAM_META.map((m) => {
    const e = eloMap.get(m.abbr);
    const f = formOf(m.abbr);
    const qbAdj = e?.qbAdj ?? 0;
    return {
      ...m,
      elo: e?.elo ?? 1500,
      qbAdj,
      ppg: f.ppg,
      papg: f.papg,
      qb: f.qb,
      qbValue: Math.min(120, Math.max(15, 60 + qbAdj)),
    };
  });

  const leagueAvg =
    teams.reduce((s, t) => s + t.ppg, 0) / teams.length || 22.8;

  return {
    teams,
    leagueAvg,
    season: maxSeason || eloSeason,
    throughWeek,
    eloWeek,
    fetchedAt: new Date().toISOString(),
  };
}
