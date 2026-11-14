import json
from pathlib import Path
import jsonschema
p=Path(__file__).with_name('DND-world-survey-2026-11-14.json');e=json.loads(p.read_text());src=json.loads(p.with_name('DND-world-survey-2026-11-14-source-check.json').read_text());dc=json.loads(Path('setting-contract.json').read_text());checks=[]
def ck(id,ok,detail):
 assert ok,id
 checks.append({'id':id,'status':'pass','detail':detail})
jsonschema.validate(e['observation'],dc['$defs']['observation']);ck('observation-schema',True,'Stable source/wave/role/access metadata')
q=e['primary_question'];ck('full-question-verbatim',q['question_verbatim']==src['question_verbatim'],'Question from organizer text, not reconstructed heading')
ck('date-from-HTML',src['posted_date_present'] and q['posted_at']=='2023-09-10','Wave date is not archive2017date/retrieval2026date')
ck('respondent-count-context',q['n_item_reported']==src['reported_respondents_from_html']==3100 and q['N_joint_archive_study'] is None,'Author-reported singlepoll count, no archive N')
for o in q['options']:ck('option-'+o['id'],src['percentages_from_html'][o['id']]==o['pct'],'Independent primary HTML percentage match')
ck('reported-partition',sum(o['pct'] for o in q['options'])==100,'Arithmetic only, not proof of form control')
ck('unknown-control',q['multiple_select'] is None,'No inference of control from100%sum')
ck('unknown-exact-counts',q['raw_option_counts'] is None,'Do not invent1457 exactpeople from47%×3100')
ck('no-fixed-recall',q['fieldwork_end'] is None and 'no fixed' in q['behavior_period'],'Typical behavior, no invented rolling period')
ck('historical-only','Historical' in q['usable_as'],'No current2026play extrapolation')
#100 artificial rows, not actual respondents; keep settings invariant.
settings=['personal']*47+['fr']*38+['wotc_other']*8+['nonwotc']*7
for f in e['identifiability_experiment']['fixtures']:
 if f['id']=='no_maps':flags=[False]*100
 elif f['id']=='only_personal_creates':flags=[s=='personal' for s in settings]
 elif f['id']=='only_published_creates':flags=[s!='personal' for s in settings]
 else:flags=[True]*100
 ck('counterexample-'+f['id'],settings.count('personal')==47 and sum(flags)==f['map_creators'],{'map_creators':sum(flags),'setting_personal':47,'setting_published':53,'synthetic':True})
ck('construct-separation',all(e['construct_disposition'][k]=='Not measured' for k in ['actual_own_map_creation','new_regional_geography','hexcrawl_frequency','current_active_GMs']),'No world-to-map proxy substitution')
ck('no-active-change',not any(e['rating_disposition'][k] for k in ['active_rating_changed','active_inputs_changed','active_numeric_method_changed','active_pool_changed']) and e['rating_disposition']['proposed_after'] is None,'No candidate or active numerical p')
ck('no-new-product',e['product_disposition']['new_tasks']==0 and e['product_disposition']['operational_requirement'] is None,'Method audit is not game-rule/product requirement')
out={'run_id':e['run_id'],'status':'passed','checks_passed':len(checks),'checks':checks,'kind':'Temporary source/schema QA and synthetic construct examples, not product tests or observed people'}
p.with_name('DND-world-survey-2026-11-14-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks_passed':len(checks),'synthetic_counterexamples':4,'primary_poll_items':1}))

