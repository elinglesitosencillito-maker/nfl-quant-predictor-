/**
 * teams.ts — SOLO metadatos estáticos de franquicia.
 * Los datos DINÁMICOS (Elo, QB, PPG) se descargan de nfelo/nflverse.
 */

export interface TeamMeta {
  abbr: string;
  city: string;
  name: string;
  conf: 'AFC' | 'NFC';
  div: string;
  color: string;
  color2: string;
}

export interface Team extends TeamMeta {
  elo: number;
  qbAdj: number;
  ppg: number;
  papg: number;
  qb: string;
  qbValue: number;
}

export const TEAM_META: TeamMeta[] = [
  { abbr: 'KC',  city: 'Kansas City',  name: 'Chiefs',     conf: 'AFC', div: 'West',  color: '#E31837', color2: '#FFB81C' },
  { abbr: 'BUF', city: 'Buffalo',      name: 'Bills',      conf: 'AFC', div: 'East',  color: '#00338D', color2: '#C60C30' },
  { abbr: 'BAL', city: 'Baltimore',    name: 'Ravens',     conf: 'AFC', div: 'North', color: '#241773', color2: '#9E7C0C' },
  { abbr: 'CIN', city: 'Cincinnati',   name: 'Bengals',    conf: 'AFC', div: 'North', color: '#FB4F14', color2: '#000000' },
  { abbr: 'PIT', city: 'Pittsburgh',   name: 'Steelers',   conf: 'AFC', div: 'North', color: '#FFB612', color2: '#101820' },
  { abbr: 'CLE', city: 'Cleveland',    name: 'Browns',     conf: 'AFC', div: 'North', color: '#311D00', color2: '#FF3C00' },
  { abbr: 'HOU', city: 'Houston',      name: 'Texans',     conf: 'AFC', div: 'South', color: '#03202F', color2: '#A71930' },
  { abbr: 'IND', city: 'Indianapolis', name: 'Colts',      conf: 'AFC', div: 'South', color: '#002C5F', color2: '#A2AAAD' },
  { abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars',    conf: 'AFC', div: 'South', color: '#006778', color2: '#D7A22A' },
  { abbr: 'TEN', city: 'Tennessee',    name: 'Titans',     conf: 'AFC', div: 'South', color: '#0C2340', color2: '#4B92DB' },
  { abbr: 'DEN', city: 'Denver',       name: 'Broncos',    conf: 'AFC', div: 'West',  color: '#FB4F14', color2: '#002244' },
  { abbr: 'LAC', city: 'Los Angeles',  name: 'Chargers',   conf: 'AFC', div: 'West',  color: '#0080C6', color2: '#FFC20E' },
  { abbr: 'LV',  city: 'Las Vegas',    name: 'Raiders',    conf: 'AFC', div: 'West',  color: '#000000', color2: '#A5ACAF' },
  { abbr: 'MIA', city: 'Miami',        name: 'Dolphins',   conf: 'AFC', div: 'East',  color: '#008E97', color2: '#FC4C02' },
  { abbr: 'NE',  city: 'New England',  name: 'Patriots',   conf: 'AFC', div: 'East',  color: '#002244', color2: '#C60C30' },
  { abbr: 'NYJ', city: 'New York',     name: 'Jets',       conf: 'AFC', div: 'East',  color: '#125740', color2: '#FFFFFF' },
  { abbr: 'PHI', city: 'Philadelphia', name: 'Eagles',     conf: 'NFC', div: 'East',  color: '#004C54', color2: '#A5ACAF' },
  { abbr: 'DAL', city: 'Dallas',       name: 'Cowboys',    conf: 'NFC', div: 'East',  color: '#003594', color2: '#869397' },
  { abbr: 'WAS', city: 'Washington',   name: 'Commanders', conf: 'NFC', div: 'East',  color: '#5A1414', color2: '#FFB612' },
  { abbr: 'NYG', city: 'New York',     name: 'Giants',     conf: 'NFC', div: 'East',  color: '#0B2265', color2: '#A71930' },
  { abbr: 'DET', city: 'Detroit',      name: 'Lions',      conf: 'NFC', div: 'North', color: '#0076B6', color2: '#B0B7BC' },
  { abbr: 'GB',  city: 'Green Bay',    name: 'Packers',    conf: 'NFC', div: 'North', color: '#203731', color2: '#FFB612' },
  { abbr: 'MIN', city: 'Minnesota',    name: 'Vikings',    conf: 'NFC', div: 'North', color: '#4F2683', color2: '#FFC62F' },
  { abbr: 'CHI', city: 'Chicago',      name: 'Bears',      conf: 'NFC', div: 'North', color: '#0B162A', color2: '#C83803' },
  { abbr: 'TB',  city: 'Tampa Bay',    name: 'Buccaneers', conf: 'NFC', div: 'South', color: '#D50A0A', color2: '#34302B' },
  { abbr: 'ATL', city: 'Atlanta',      name: 'Falcons',    conf: 'NFC', div: 'South', color: '#A71930', color2: '#000000' },
  { abbr: 'NO',  city: 'New Orleans',  name: 'Saints',     conf: 'NFC', div: 'South', color: '#D3BC8D', color2: '#101820' },
  { abbr: 'CAR', city: 'Carolina',     name: 'Panthers',   conf: 'NFC', div: 'South', color: '#0085CA', color2: '#101820' },
  { abbr: 'SF',  city: 'San Francisco',name: '49ers',      conf: 'NFC', div: 'West',  color: '#AA0000', color2: '#B3995D' },
  { abbr: 'SEA', city: 'Seattle',      name: 'Seahawks',   conf: 'NFC', div: 'West',  color: '#002244', color2: '#69BE28' },
  { abbr: 'LAR', city: 'Los Angeles',  name: 'Rams',       conf: 'NFC', div: 'West',  color: '#003594', color2: '#FFA300' },
  { abbr: 'ARI', city: 'Arizona',      name: 'Cardinals',  conf: 'NFC', div: 'West',  color: '#97233F', color2: '#FFB612' },
];
