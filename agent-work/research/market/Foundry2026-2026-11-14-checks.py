import json
from pathlib import Path
from decimal import Decimal as D
p=Path(__file__).with_name('Foundry2026-2026-11-14.json');e=json.loads(p.read_text());raw=json.loads(p.with_name('Foundry2026-2026-11-14-source-tables.json').read_text());checks=[]
def ck(id,condition,observed):
 assert condition,(id,observed)
 checks.append({'id':id,'status':'pass','observed':observed})
def pct(s):return D(s.rstrip('%'))
def change(s):return 0 if s=='-' else int(s)
a={int(r[0]):r for r in raw['2025']['tables'][0][1:]}
b={int(r[0]):r for r in raw['2026']['tables'][0][1:] if len(r)==5}
ck('source-row-counts',len(a)==25 and len(b)==31,{'2025':len(a),'2026':len(b)})
ck('complete-prior-corpus',set(r['rank_2025'] for r in e['crosswalk'])==set(a),'Every prior published row exactly once')
for r in e['crosswalk']:
 x,y=a[r['rank_2025']],b[r['rank_2026']]
 ck('crosswalk-'+r['source_key'],r['source_label_2025']==x[1] and r['source_label_2026']==y[1] and D(str(r['installed_pct_2025']))==pct(x[2]) and D(str(r['installed_pct_2026']))==pct(y[2]) and D(str(r['most_played_pct_2026']))==pct(y[3]) and r['published_change_2026']==change(y[4]),'Exact rank/label/percent/Change vs independently extracted HTML')
 assert r['installed_delta_pp']==float(pct(y[2])-pct(x[2]))
 assert r['rank_difference_between_published_tables']==r['rank_2025']-r['rank_2026']
for r in e['source2026']:
 y=b[r['rank']]
 ck('2026-'+r['source_key'],D(str(r['installed_pct']))==pct(y[2]) and D(str(r['most_played_pct']))==pct(y[3]) and r['published_change']==change(y[4]),'All31 values match primary HTML, not fresh audience count')
mis=[r['source_key'] for r in e['crosswalk'] if not r['change_matches_published_rank_difference']]
ck('13-differences',len(mis)==13,mis)
ck('2025-missing-column',all(r['most_played_pct_2025'] is None for r in e['crosswalk']),'Missing is null, not zero/installed')
ck('2025-header','Pct. Most Played' not in raw['2025']['tables'][0][0],'No most-played percentage column')
ck('telemetry-not-survey',e['collection']['question_verbatim'] is None,'No invented survey wording')
ck('no-denominator',e['collection']['N'] is None and e['collection']['opt_in_share_2026_pct'] is None,'Do not carry51% forward')
ck('DND5-invalid-series',D('52.11')-D('64.28')==D('-12.17'),'Arithmetic possible but unit comparison invalid; do not use')
ck('DND5-installed-series',D('62.68')-D('64.28')==D('-1.60'),'Same-label descriptive percentage-point difference only')
ck('PF2-installed-series',D('27.58')-D('30.52')==D('-2.94'),'No GM count inference')
# Synthetic unit fixtures, not observations of actual people.
def dominant(worlds):return max(worlds,key=lambda w:w[1])[0]
worlds=[('PF2',10)]*10+[('DND5',20)]
ck('fixture-world-versus-system-sum',dominant(worlds)=='DND5' and sum(t for s,t in worlds if s=='PF2')==100,'Known output: dominant world DND5 despite100PF2hours across worlds')
users=[[('DND5',1000)],[('PF2',10)],[('PF2',10)]]
ck('fixture-hours-versus-users',[dominant(w) for w in users].count('PF2')==2 and sum(t for w in users for s,t in w if s=='DND5')==1000,'Known output: PF2 wins dominant-user2:1; DND5 wins aggregate1000:20hours')
ck('fixture-installation-overlap',sum([100,100])==200,'If each synthetic reporter installs both systems, installation totals200%, not200people')
ck('no-active-change',not any(e['rating_disposition'][k] for k in ['active_rating_changed','active_numeric_method_changed','active_inputs_changed','active_pool_changed']),'No numerical replacement proposal justified')
ck('no-product-gap-invention',e['new_tasks']==0 and e['operational_requirement'] is None,'No game rule in this audit')
out={'run_id':e['run_id'],'status':'passed','checks':checks,'checks_passed':len(checks),'mismatches':mis,'kind':'Temporary evidence QA and synthetic unit counterexamples; not product tests'}
p.with_name('Foundry2026-2026-11-14-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks_passed':len(checks),'crosswalk_rows':25,'source2026_rows':31,'Change_mismatches':len(mis)}))

