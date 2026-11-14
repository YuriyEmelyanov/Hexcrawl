import json
from decimal import Decimal as D
from pathlib import Path
p=Path(__file__).with_name('GM-survey-2026-11-14.json')
e=json.loads(p.read_text()); rows={r['id']:r for r in e['comparison_rows']}; checks=[]
def check(id,condition,evidence):
 assert condition,id
 checks.append(dict(id=id,status='pass',evidence=evidence))
def total(d): return sum(D(str(v)) for v in d.values())
check('five_question_families',len(rows)==5,'Bounded complete comparison corpus')
check('distinct_wave_keys',e['waves']['y2025']['wave_key']!=e['waves']['y2026']['wave_key'],'No wave merge')
check('unknown_item_n',all(w['item_n'] is None for w in e['waves'].values()),'No substitution of N987')
check('2025_exact_N_unknown',e['waves']['y2025']['N'] is None,'Only lower bound reported')
check('Q4_nonexclusive2025',total(rows['systems']['y2025'])==D('223.5'),'Not unique summed people')
check('Q4_nonexclusive2026',total(rows['systems']['y2026'])==D('203.5'),'Not unique summed people')
for year,expected in [('y2025','100.0'),('y2026','99.9')]:
 check('maps_partition_'+year,total(rows['maps'][year])==D(expected),'Published percentage rounding only; does not establish n/control')
check('reported_map_categories_drift',set(rows['maps']['y2025'])!=set(rows['maps']['y2026']),'Raw categories retained before aliases')
check('None_not_separate2026','None' in rows['maps']['y2025'] and 'None' not in rows['maps']['y2026'],'No conclusion that non-users disappeared')
check('new_separate_Draft','Dungeon Draft' in rows['maps']['y2026'] and 'Dungeon Draft' not in rows['maps']['y2025'],'Not first-ever adoption')
a,b=D('56.9'),D('9.2'); bounds=(max(a,b),min(D(100),a+b))
check('union_bounds',bounds==(D('56.9'),D('66.1')),'Conditional same denominator; overlap unknown')
for overlap in [D('0'),D('4'),D('9.2')]:
 check('union_fixture_'+str(overlap),bounds[0]<=a+b-overlap<=bounds[1],'Known expected union '+str(a+b-overlap)+'%')
check('2026_only_recency',rows['recency']['y2025'] is None,'No prior timepoint invented')
check('no_active_change',not any(e['numeric_policy'][k] for k in ['active_rating_changed','active_inputs_changed','active_pool_changed','active_numeric_method_changed']),'Qualitative comparison only')
check('no_product_operation',e['development_effect']['new_tasks']==0 and e['development_effect']['new_rules']==0,'No artificial product backlog task')
out={'run_id':e['run_id'],'checks':checks,'passed':len(checks),'kind':'Temporary reproducible evidence QA, not product tests','source_chart_values_match_visual_inspection':True}
p.with_name('GM-survey-2026-11-14-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'union_bounds':[str(x) for x in bounds]}))

