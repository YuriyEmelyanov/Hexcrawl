import { assess } from '../rc7-top100/market-rank.mjs';

const levels = ['L1', 'L2', 'L3'];
function bounds(pair) {
  if (pair === null) return [0, 1000];
  if (!Array.isArray(pair) || pair.length !== 2 ||
      !pair.every(n => Number.isFinite(n) && n >= 0 && n <= 1000) || pair[0] > pair[1])
    throw new Error('Invalid component interval');
  return pair;
}

export function score(input) {
  const ids = input.apps.map(app => app.id);
  if (new Set(ids).size !== ids.length || ids.includes('HexCrawl'))
    throw new Error('Duplicate application or self comparison');
  return Object.fromEntries(levels.map(level => {
    const row = input.levels[level];
    const rivals = input.apps.filter(app => Object.hasOwn(app.audience, level));
    const market = assess({ours:row.ours, rivals:rivals.map(app => app.audience[level]), unseenMax:row.unseenMax});
    const core = bounds(row.core), games = bounds(row.games);
    const range = [0, 1].map(i => (core[i] + games[i] + market.points[i]) / 3);
    return [level, {core:row.core, games:row.games, competitorIds:rivals.map(app => app.id),
      market, guaranteed:range[0], possible:range[1], exact:range[0] === range[1] ? range[0] : null}];
  }));
}
