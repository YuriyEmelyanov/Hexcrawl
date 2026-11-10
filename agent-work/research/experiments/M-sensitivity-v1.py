"""Deterministic diagnostic, not a replacement rating or product test.
Run at repo root: python agent-work/research/experiments/M-sensitivity-v1.py > /tmp/M-sensitivity-v1.json
Only the focal game's M changes to its already stored low/high endpoint.
"""
import json, math, pathlib, hashlib
PATH='agent-work/market/three-scenario-ranking-2026-11-06.json'
raw_input=pathlib.Path(PATH).read_bytes()
blob=hashlib.sha1(b'blob '+str(len(raw_input)).encode()+b'\0'+raw_input).hexdigest()
assert blob=='ea0d62e91e7e97f938268e14e4fdd484668748d8','Frozen active input changed; create a new experiment version, do not overwrite v1'
data=json.loads(raw_input)
rows={x['id']:x for x in data['rows']}
reference={x['id']:next(z for z in x['scenarios']if z['name']=='reference') for x in data['rows'] if x.get('scenarios')}
full=[x['id']for x in data['ranking']]
create=[x['id']for x in data['scenario_rankings']['create']]
def ranks(values,relative_tolerance=0):
    out={}
    for id,v in values.items():
        tol=relative_tolerance*max(1,abs(v))
        above=sum(w-v>tol for w in values.values())
        equal=sum(abs(w-v)<=tol for w in values.values())
        out[id]=above+(equal+1)/2
    return out
def top(rank,n):
    ordered=sorted(rank,key=lambda id:(rank[id],id))
    cutoff=rank[ordered[min(n,len(ordered))-1]]
    return [id for id in ordered if rank[id]<=cutoff]
def calculate(focal=None,M=None,relative_tolerance=0):
    D={};U={}
    for id,s in reference.items():
        m=M if id==focal else s['M']
        D[id]=[None if p is None else m*p*s['T']for p in s['p']]
        U[id]=[None if v is None else v*s['R']*s['C']for v in D[id]]
    standalone=[ranks({id:U[id][axis]for id in (create if axis==0 else full)},relative_tolerance)for axis in range(3)]
    axes=[ranks({id:U[id][axis]for id in full},relative_tolerance)for axis in range(3)]
    overall=ranks({id:-sum(a[id]for a in axes)/3 for id in full},relative_tolerance)
    return {'D':D,'U':U,'standalone':standalone,'overall':overall,'overall_axes':axes,
            'sets':{'overall':{str(n):top(overall,n)for n in [5,10,20]},**{name:{str(n):top(standalone[k],n)for n in[5,10,20]}for k,name in enumerate(['create','develop','play_now'])}}}
def eq(x,y):assert math.isclose(x,y,rel_tol=1e-9,abs_tol=1e-9),(x,y)
# Falsification guards: exact reference reproduction precedes any experiment.
b=calculate();assert len(full)==70 and len(create)==73
representation_discrepancy={'pairs':[{'ids':['DS','WOD20'],'play_now_D':[reference[id]['D'][2]for id in['DS','WOD20']],'active_ranks':[reference[id]['ranks'][2]for id in['DS','WOD20']]}],
    'legacy_audit_relative_tolerance':1e-10,
    'legacy_audit_source':'agent-work/market/recompute-three-scenario-ranking.mjs ranks() helper',
    'interpretation':'Exact serialized comparisons reproduce active ranks. The historical helper tolerance merges an almost-equal pair and changes DS/HARN overall tie. This experiment uses exact comparisons solely to reproduce current active data, not to recommend them as the correct long-term tie policy.',
    'tolerant_reference_differences':[
        {'game':'DS','play_now_active':65,'play_now_tolerant':65.5,'overall_active':64.5,'overall_tolerant':65},
        {'game':'WOD20','play_now_active':66,'play_now_tolerant':65.5,'overall_active':66,'overall_tolerant':66},
        {'game':'HARN','overall_active':64.5,'overall_tolerant':64}],
    'active_change':False,'proposal':'No tie-policy correction proposed or activated; a future correction needs exact versioned owner approval and full low/reference/high comparison.'}
tolerant=calculate(relative_tolerance=1e-10)
representation_discrepancy['tolerant_reference_differences']=[{'game':id,'play_now_active':b['standalone'][2][id],'play_now_tolerant':tolerant['standalone'][2][id],'overall_active':b['overall'][id],'overall_tolerant':tolerant['overall'][id]}for id in full if b['standalone'][2][id]!=tolerant['standalone'][2][id]or b['overall'][id]!=tolerant['overall'][id]]
for id,s in reference.items():
    for k in range(3):
        if s['D'][k]is not None:eq(b['D'][id][k],s['D'][k]);eq(b['U'][id][k],s['U'][k])
for x in data['ranking']:
    eq(b['overall'][x['id']],x['place'])
    for k in range(3):eq(b['overall_axes'][k][x['id']],x['ranks'][k])
for k,name in enumerate(['create','develop','play_now']):
    for x in data['scenario_rankings'][name]:eq(b['standalone'][k][x['id']],x['rank'])
assert ranks({'a':9,'b':9,'c':2})=={'a':1.5,'b':1.5,'c':3}
assert top({'a':1,'b':2.5,'c':2.5,'d':4},2)==['a','b','c']
cases=[]
for id in full[:10]:
    for endpoint in ['low','high']:
        M=next(z['M']for z in rows[id]['scenarios']if z['name']==endpoint)
        z=calculate(id,M)
        changes={}
        for axis,sets in b['sets'].items():
            changes[axis]={}
            for n,old in sets.items():
                new=z['sets'][axis][n]
                changes[axis][n]={'entered':sorted(set(new)-set(old)),'left':sorted(set(old)-set(new)),'members':new}
        cases.append({'focal_game':id,'endpoint_label':endpoint,'M_before':reference[id]['M'],'M_diagnostic':M,
            'p_T_R_C':'unchanged reference for every game; all other M unchanged',
            'before':{'overall_rank':b['overall'][id],'scenario_ranks':[a[id]for a in b['standalone']],'D':b['D'][id]},
            'diagnostic':{'overall_rank':z['overall'][id],'scenario_ranks':[a[id]for a in z['standalone']],'D':z['D'][id],
                'D_gt_1000':[v>1000 for v in z['D'][id]],'threshold_note':'Strict D>1000 only, not evidence of documented suitability or a complete eligible-pool calculation.'},
            'membership_changes':changes})
summary=[]
for id in full[:10]:
    own=[c for c in cases if c['focal_game']==id]
    summary.append({'game_id':id,'baseline_overall':b['overall'][id],
        'overall_at_own_low_high':[c['diagnostic']['overall_rank']for c in own],
        'create_at_own_low_high':[c['diagnostic']['scenario_ranks'][0]for c in own],
        'in_overall_top5_at_both_own_endpoints':all(id in c['membership_changes']['overall']['5']['members']for c in own),
        'in_create_top5_at_both_own_endpoints':all(id in c['membership_changes']['create']['5']['members']for c in own)})
print(json.dumps({'experiment_id':'HX-RSR-EXP-M-SENSITIVITY-v1','version':1,
    'status':'diagnostic_only_not_activation_candidate','active_ranking_changed':False,
    'ranking_ref':PATH,'ranking_version':data['model_version'],
    'design':'20 one-at-a-time endpoints: existing low/highM for each referenceoveralltop10, all p/T/R/C and othergamesM fixed at reference. Not joint scenarios or confidence bounds.',
    'unit':'Existing hypothetical GMs per12months; not new observations',
    'no_new_weight':True,'population_compositions':{'overall':70,'standalone_create':73},
    'representation_discrepancy':representation_discrepancy,
    'validation':{'reference_formulas':'all non-null D/U reproduced','reference_ranks':'all70 overall and all standalone scenario ranks reproduced','tie_average_fixture':'pass','boundary_tie_fixture':'pass'},
    'baseline_sets':b['sets'],'summary':summary,'cases':cases,
    'retained_in_top5_all_20_cases':{axis:sorted(set.intersection(*(set(c['membership_changes'][axis]['5']['members'])for c in cases)))for axis in ['overall','create']},
    'limits':['No calibration of M, p or T. Existing endpoints are expert priors, not measured minima/maxima.',
        'Only focalgameM varied; no simultaneous uncertainty, correlations, probability of ranks or market forecast.',
        'TopN evaluation sets are separate from strict demand threshold and source applicability; no support or score.',
        'No replacement active input/method/version is proposed. Experiment results must never overwrite active ranking/cohorts.']},ensure_ascii=False,indent=2))
