import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {measure} from '../calculate.mjs';

const read = async url => JSON.parse(await readFile(new URL(url, import.meta.url), 'utf8'));
const baseline = await read('../baseline.json');
const cohorts = await read('../../../../score/cohorts-2026-11-15.json');
const history = await read('../pr-history.json');

function summarize(level, scenario, data = baseline) {
  const ids = cohorts.scenario_sets[scenario].top20.map(row => row.id);
  assert.deepEqual(ids, data.scenario_order[scenario]);
  assert.equal(new Set(ids).size, ids.length);
  const games = ids.map(id => {
    const rows = data.rules.filter(row => row.game === id && row.level === level);
    return {id, ...measure(rows), corpus_closed: data.closed_corpora[level].includes(id)};
  });
  const common = measure(data.common.filter(row => row.level === level));
  const perSlot = 1000 / ids.length;
  const confirmed = games.reduce((sum, g) => sum + perSlot * (g.earned / (g.n || 1)), 0);
  return {level, scenario, games, slot_points:perSlot, games_catalogued:games.filter(g => g.n).length,
    games_certified:games.filter(g => g.corpus_closed && g.n && g.full === g.n).length,
    confirmed_points:confirmed, remaining_to_goal:1000-confirmed,
    common:{...common, confirmed_points:common.n ? 1000*common.earned/common.n : null}};
}

const levels = [summarize(1,'create'), summarize(2,'play_now')];
const pr_deltas = history.map(pr => {
  const measured = levels.map(l => {
    const game_contributions = pr.delta_game.filter(x => x.level === l.level).flatMap(x => {
      const g = l.games.find(g => g.id === x.game);
      if (!g) return [];
      assert.ok(baseline.rules.some(row => row.id === x.id && row.level === x.level && row.game === x.game));
      return [{id:x.id, game:x.game, points:l.slot_points*(x.after-x.before)/g.n}];
    });
    const common_points = pr.delta_common.reduce((sum,x) => {
      const row = baseline.common.find(c => c.id === x.id);
      assert.ok(row);
      return row.level === l.level ? sum+1000*(x.after-x.before)/l.common.n : sum;
    },0);
    return {level:l.level, confirmed_game_delta:game_contributions.reduce((s,x)=>s+x.points,0),
      game_contributions, confirmed_common_delta:common_points};
  });
  return {pr:pr.pr,parent:pr.parent,release:pr.release,measured};
});

const shared = levels[0].games.filter(g => levels[1].games.some(o => o.id === g.id)).length;
assert.equal(shared,12);
assert.equal(levels[0].games_catalogued,12);
assert.equal(levels[1].games_catalogued,10);
assert.equal(pr_deltas.length,10);
assert.ok(Math.abs(pr_deltas.find(x=>x.pr===509).measured[0].confirmed_game_delta - 50/29)<1e-10);

// Isolation regression: SI belongs to create only, TOR2 to play_now only.
// Synthetic probes are applied to copies; their completions never enter the published report.
for (const [id,own,other] of [['SI',0,1],['TOR2',1,0]]) {
  const probe = structuredClone(baseline);
  for (const l of levels) probe.rules.push({game:id,level:l.level,id:'test-'+id+'-'+l.level,status:'full'});
  const changed = levels.map(l => summarize(l.level,l.scenario,probe).confirmed_points);
  assert.ok(changed[own]>levels[own].confirmed_points);
  assert.equal(changed[other],levels[other].confirmed_points);
}
console.log(JSON.stringify({revision:'1.3.0-rc2-scenarios',status:'awaiting_owner_approval',
  product_sha:baseline.release,cohort_version:cohorts.version,shared_games:shared,levels,
  level3:{confirmed_points:null,reason:'No approved scenario cohort and requirement denominator'},
  pr_deltas,leadership:{L1:'unverified',L2:'unverified',L3:'unverified'}},null,2));
