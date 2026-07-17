import type { Team } from './teams';

export const HOME_FIELD_ELO = 65;
export const ELO_PER_POINT = 25;
export const QB_MAX_ELO = 120;
export const MC_ITERATIONS = 10000;

const SCORE_WEIGHTS: Record<number, number> = {
  0: 1.0, 1: 0.001, 2: 0.05, 3: 1.35, 4: 0.02, 5: 0.04,
  6: 1.18, 7: 1.45, 8: 0.35, 9: 0.55, 10: 1.30, 11: 0.22,
  12: 0.50, 13: 1.15, 14: 1.30, 15: 0.55, 16: 0.85, 17: 1.35,
  18: 0.50, 19: 0.60, 20: 1.30, 21: 1.15, 22: 0.60, 23: 1.00,
  24: 1.30, 25: 0.55, 26: 0.72, 27: 1.10, 28: 1.05, 29: 0.60,
  30: 1.00, 31: 1.05, 32: 0.60, 33: 0.78, 34: 0.95, 35: 0.85,
  36: 0.70, 37: 0.78, 38: 0.82, 39: 0.60, 40: 0.70, 41: 0.75,
  42: 0.70, 43: 0.62, 44: 0.70, 45: 0.65,
};
const scoreWeight = (s: number): number => SCORE_WEIGHTS[s] ?? (s > 45 ? 0.55 : 0.6);

export interface GameConditions {
  windMph: number;
  tempC: number;
  homeQBOut: boolean;
  awayQBOut: boolean;
}

export interface MonteCarloSummary {
  iterations: number;
  homeWinPct: number;
  awayWinPct: number;
  tiePct: number;
  meanHome: number;
  meanAway: number;
  medianMargin: number;
  meanTotal: number;
  marginHist: { margin: number; pct: number }[];
  topScores: { home: number; away: number; pct: number }[];
  overPct: number;
  underPct: number;
  coverHomePct: number;
  coverAwayPct: number;
}

export interface Prediction {
  eloHomeAdj: number;
  eloAwayAdj: number;
  eloDiff: number;
  eloExpectancyHome: number;
  qbPenaltyHome: number;
  qbPenaltyAway: number;
  lambda: number;
  mu: number;
  spreadLine: number;
  spreadLabel: string;
  totalLine: number;
  verdict: 'home' | 'away';
  verdictPct: number;
  fairMLHome: number;
  fairMLAway: number;
  mc: MonteCarloSummary;
  homeDist: number[];
  awayDist: number[];
  weatherNotes: string[];
}

export const winExpectancy = (d: number): number => 1 / (Math.pow(10, -d / 400) + 1);

export const qbPenalty = (team: Team, out: boolean): number => {
  if (!out) return 0;
  const starter = Math.min(team.qbValue, QB_MAX_ELO);
  const replacement = Math.min(35, starter * 0.3);
  return Math.max(0, starter - replacement);
};

export function poissonPmf(lambda: number, max: number): number[] {
  const pmf = new Array<number>(max + 1);
  let p = Math.exp(-lambda);
  pmf[0] = p;
  for (let k = 1; k <= max; k++) {
    p = (p * lambda) / k;
    pmf[k] = p;
  }
  return pmf;
}

export function keyNumberDistribution(lambda: number, max = 60): number[] {
  const raw = poissonPmf(lambda, max);
  const weighted = raw.map((p, s) => p * scoreWeight(s));
  const z = weighted.reduce((a, b) => a + b, 0);
  return weighted.map((p) => p / z);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randNormal = (rng: () => number): number => {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
function poissonSample(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * randNormal(rng)));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

interface EventProfile { tdShare: number; fgShare: number; dispersion: number }

function simulateTeamScore(
  lambda: number, profile: EventProfile, rng: () => number,
): number {
  const jitter = Math.max(0.35, 1 + randNormal(rng) * 0.11 * profile.dispersion);
  const lam = lambda * jitter;
  const nTD = poissonSample((lam * profile.tdShare) / 7, rng);
  const nFG = poissonSample((lam * profile.fgShare) / 3, rng);
  let pts = nFG * 3;
  for (let i = 0; i < nTD; i++) {
    pts += 6;
    if (rng() < 0.08) pts += rng() < 0.48 ? 2 : 0;
    else pts += rng() < 0.945 ? 1 : 0;
  }
  if (rng() < 0.06) pts += 2;
  return pts;
}

export function predecirPartido(
  home: Team,
  away: Team,
  cond: GameConditions,
  leagueAvg = 22.8,
  seed = 20250901,
): Prediction {
  const notes: string[] = [];

  const penH = qbPenalty(home, cond.homeQBOut);
  const penA = qbPenalty(away, cond.awayQBOut);
  if (penH > 0) notes.push(`QB local (${home.qb}) OUT: −${penH.toFixed(0)} Elo`);
  if (penA > 0) notes.push(`QB visitante (${away.qb}) OUT: −${penA.toFixed(0)} Elo`);

  const eloH = home.elo + home.qbAdj - penH + HOME_FIELD_ELO;
  const eloA = away.elo + away.qbAdj - penA;
  const d = eloH - eloA;
  const E = winExpectancy(d);
  const eloMargin = d / ELO_PER_POINT;

  const avg = leagueAvg;
  const offH = home.ppg / avg, defH = home.papg / avg;
  const offA = away.ppg / avg, defA = away.papg / avg;

  let lambdaRaw = offH * defA * avg * 1.045;
  let muRaw = offA * defH * avg * 0.985;

  const poissonMargin = lambdaRaw - muRaw;
  const totalRaw = lambdaRaw + muRaw;
  const margin = 0.6 * eloMargin + 0.4 * poissonMargin;
  let lambda = (totalRaw + margin) / 2;
  let mu = (totalRaw - margin) / 2;

  const windy = cond.windMph > 15;
  const cold = cond.tempC < 0;
  const profile: EventProfile = { tdShare: 0.72, fgShare: 0.26, dispersion: 1.0 };
  if (windy) {
    lambda *= 0.88; mu *= 0.88;
    profile.tdShare = 0.66; profile.fgShare = 0.30; profile.dispersion = 1.18;
    notes.push(`Viento ${cond.windMph} mph > 15: λ y μ −12%, varianza aérea +18%`);
  }
  if (cold) {
    lambda *= 0.955; mu *= 0.955;
    profile.tdShare -= 0.02; profile.fgShare += 0.02;
    profile.dispersion *= 0.94;
    notes.push(`Temperatura ${cond.tempC}°C < 0°C: sesgo a juego terrestre, varianza −6%`);
  }
  lambda = Math.max(6, lambda);
  mu = Math.max(6, mu);
  lambdaRaw = lambda; muRaw = mu;

  const homeDist = keyNumberDistribution(lambda);
  const awayDist = keyNumberDistribution(mu);

  const rng = mulberry32(seed);
  const N = MC_ITERATIONS;
  let winsH = 0, winsA = 0, ties = 0;
  let sumH = 0, sumA = 0, sumT = 0;
  const margins = new Float64Array(N);
  const totals = new Float64Array(N);
  const scoreCount = new Map<string, number>();
  const marginCount = new Map<number, number>();

  for (let i = 0; i < N; i++) {
    const pace = Math.max(0.6, 1 + randNormal(rng) * 0.07);
    let hs = simulateTeamScore(lambda * pace, profile, rng);
    let as_ = simulateTeamScore(mu * pace, profile, rng);

    if (hs === as_) {
      if (rng() < 0.055) { ties++; }
      else if (rng() < E) { hs += rng() < 0.55 ? 6 : 3; winsH++; }
      else { as_ += rng() < 0.55 ? 6 : 3; winsA++; }
    } else if (hs > as_) winsH++;
    else winsA++;

    sumH += hs; sumA += as_; sumT += hs + as_;
    margins[i] = hs - as_;
    totals[i] = hs + as_;
    const key = `${hs}-${as_}`;
    scoreCount.set(key, (scoreCount.get(key) ?? 0) + 1);
    const mBin = Math.max(-30, Math.min(30, hs - as_));
    marginCount.set(mBin, (marginCount.get(mBin) ?? 0) + 1);
  }

  const sortedMargins = Array.from(margins).sort((a, b) => a - b);
  const medianMargin = sortedMargins[Math.floor(N / 2)];
  const meanTotal = sumT / N;

  let spreadLine = Math.round(-medianMargin * 2) / 2;
  if (Number.isInteger(spreadLine)) spreadLine += spreadLine >= 0 ? 0.5 : -0.5;
  let totalLine = Math.round(meanTotal * 2) / 2;
  if (Number.isInteger(totalLine)) totalLine += 0.5;

  let over = 0, coverH = 0;
  for (let i = 0; i < N; i++) {
    if (totals[i] > totalLine) over++;
    if (margins[i] > -spreadLine) coverH++;
  }

  const topScores = Array.from(scoreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, c]) => {
      const [h, a] = k.split('-').map(Number);
      return { home: h, away: a, pct: (c / N) * 100 };
    });

  const marginHist: { margin: number; pct: number }[] = [];
  for (let m = -30; m <= 30; m++) {
    marginHist.push({ margin: m, pct: ((marginCount.get(m) ?? 0) / N) * 100 });
  }

  const homeWinPct = (winsH / N) * 100;
  const awayWinPct = (winsA / N) * 100;
  const tiePct = (ties / N) * 100;

  const verdict: 'home' | 'away' = homeWinPct >= awayWinPct ? 'home' : 'away';
  const verdictPct = verdict === 'home' ? homeWinPct : awayWinPct;

  const favLabel = spreadLine < 0
    ? `${home.abbr} ${spreadLine.toFixed(1)}`
    : `${away.abbr} ${(-spreadLine).toFixed(1)}`;

  return {
    eloHomeAdj: eloH,
    eloAwayAdj: eloA,
    eloDiff: d,
    eloExpectancyHome: E,
    qbPenaltyHome: penH,
    qbPenaltyAway: penA,
    lambda: lambdaRaw,
    mu: muRaw,
    spreadLine,
    spreadLabel: favLabel,
    totalLine,
    verdict,
    verdictPct,
    fairMLHome: 100 / homeWinPct,
    fairMLAway: 100 / awayWinPct,
    mc: {
      iterations: N,
      homeWinPct, awayWinPct, tiePct,
      meanHome: sumH / N,
      meanAway: sumA / N,
      medianMargin,
      meanTotal,
      marginHist,
      topScores,
      overPct: (over / N) * 100,
      underPct: 100 - (over / N) * 100,
      coverHomePct: (coverH / N) * 100,
      coverAwayPct: 100 - (coverH / N) * 100,
    },
    homeDist,
    awayDist,
    weatherNotes: notes,
  };
}
