import json,hashlib
from pathlib import Path
import jsonschema
p=Path(__file__).with_name('COS-L1-2026-11-14.json');e=json.loads(p.read_text());dc=json.loads(Path('cos-contract.json').read_text());checks=[]
def ck(id,ok,detail):
 assert ok,id
 checks.append({'id':id,'status':'pass','detail':detail})
jsonschema.validate(e['operational_requirement'],dc['$defs']['operational_requirement'])
for o in e['observations']:jsonschema.validate(o,dc['$defs']['observation'])
ck('schema',True,'1 operational requirement +3 observation records validated')
for a in e['asset_integrity']:
 raw=Path('/workspace/scratch/cos-source',a['name']+'.pdf').read_bytes()
 ck('integrity-'+a['name'],len(raw)==a['bytes'] and hashlib.sha256(raw).hexdigest()==a['sha256'],'Exact official-source bytes retained locally; no publication of PDF')
ck('starter-edition','v1.02' in e['sources'][1]['edition'] and 'Beta' in e['sources'][1]['edition'],'Current starter distinguished from fullHandbook/beta')
ck('PDF-versus-print-locator',e['prepared_artifact']['source_page_labels']['37']==36,'Scene PDF37 is printed36')
ck('map-artifact-page',e['prepared_artifact']['source_artifact_pages']==[46],'Fullpage46 visually inspected; page47 promotion excluded')
ck('not-independent-GM',e['prepared_artifact']['independent_GM_projects']==0 and e['new_people_counted']==0,'Publisher assets do not count as GM projects')
ck('scope-no-all-Cosmere','Mistborn' in e['scope_boundaries']['settings'],'Stormlight only, other settings excluded')
# Analyst fixture demonstrating only source-defined square step budget, not product code.
def step_cost(path,slowed=False,blocked=False,budget=30):
 if blocked:return {'valid':False,'spent':0,'remaining':budget}
 cost=(10 if slowed else 5)*(len(path)-1)
 if cost>budget:return {'valid':False,'spent':0,'remaining':budget}
 return {'valid':True,'spent':cost,'remaining':budget-cost}
path=[(0,0),(1,0),(2,1),(2,2)]
ck('normal-known-output',step_cost(path)==dict(valid=True,spent=15,remaining=15),'3steps including diagonal:15ft')
ck('Slowed-known-output',step_cost(path,True)==dict(valid=True,spent=30,remaining=0),'3steps:30ft')
ck('blocked-corner-output',step_cost(path[:2],blocked=True)==dict(valid=False,spent=0,remaining=30),'Invalid attempt preserves input budget; analyst transaction criterion')
ck('insufficient-normal',step_cost(path[:2],budget=4)==dict(valid=False,spent=0,remaining=4),'Below5ft rejected')
ck('insufficient-Slowed',step_cost(path[:2],slowed=True,budget=9)==dict(valid=False,spent=0,remaining=9),'Below10ft rejected')
ck('tactical-boundary',e['operational_requirement']['layer']=='L3' and not e['operational_requirement']['canonical_rule_refs'],'No automatic regional canonical binding')
ck('runtime-unknown','unknown' in e['product_disposition']['runtime_evidence'],'Source is not implementation evidence')
ck('no-active-change',not any(e['rating_disposition'][k] for k in ['active_rating_changed','active_inputs_changed','active_numeric_method_changed','active_pool_changed']),'No rating conversion')
ck('no-queue-change',e['product_disposition']['new_tasks']==0 and not e['product_disposition']['backlog_changed'],'No current L1 gap invented')
out={'run_id':e['run_id'],'status':'passed','checks_passed':len(checks),'checks':checks,'kind':'Temporary source/schema/integrity QA and illustrative fixture, not actual HexCrawl runtime/product tests'}
p.with_name('COS-L1-2026-11-14-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks_passed':len(checks),'observations':3,'operational_requirements':1,'product_tasks':0}))

