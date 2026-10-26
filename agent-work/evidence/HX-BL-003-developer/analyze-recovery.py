import json,pathlib,statistics,math,hashlib
from PIL import Image,ImageChops
p=pathlib.Path('/tmp/hx30/data');raw=json.loads((p/'timing/paired/raw.json').read_text());rows=raw['rows'];out={'run_id':40252325923,'artifact_id':12624578941,'archive_sha256':hashlib.sha256(pathlib.Path('/tmp/hx30/paired.zip').read_bytes()).hexdigest(),'environment':raw['environment'],'rows':len(rows),'errors':raw['errors'],'groups':[],'regressions':[]}
def med(v):return statistics.median(v)
def p95(v):return sorted(v)[math.ceil(len(v)*.95)-1]
def stats(v):return {'n':len(v),'min':min(v),'median':med(v),'max':max(v),'p95':p95(v)}
for cp in dict.fromkeys(r['input'] for r in rows):
 a=[r for r in rows if r['input']==cp and r['variant']=='baseline'];b=[r for r in rows if r['input']==cp and r['variant']=='candidate'];aw=sorted([r for r in a if type(r['iteration'])==int],key=lambda r:r['iteration']);bw=sorted([r for r in b if type(r['iteration'])==int],key=lambda r:r['iteration']);g={'input':cp,'N_before':aw[0]['before']['N'],'N_after':aw[0]['after']['N'],'metrics':{}}
 for m in ['generation_ms','render_ms','e2e_ms']:
  av=[r[m] for r in aw];bv=[r[m] for r in bw];am,bm=med(av),med(bv);g['metrics'][m]={'baseline':stats(av),'candidate':stats(bv),'saving_ms':am-bm,'saving_fraction':(am-bm)/am,'paired_candidate_over_baseline':[y/x for x,y in zip(av,bv)],'wins':sum(y<x for x,y in zip(av,bv))}
 e=g['metrics']['e2e_ms'];
 if e['saving_ms']<-50 and e['saving_fraction']<-.1:out['regressions'].append({'input':cp,'metric':'warm_e2e','data':e})
 g['navigation']={}
 for nav in ['zoom','pan']:
  av=[p95(r['navigation'][nav]) for r in aw];bv=[p95(r['navigation'][nav]) for r in bw];am,bm=med(av),med(bv);g['navigation'][nav]={'baseline_per_run_p95':av,'candidate_per_run_p95':bv,'baseline_median_p95':am,'candidate_median_p95':bm,'baseline_pooled_p95':p95([v for r in aw for v in r['navigation'][nav]]),'candidate_pooled_p95':p95([v for r in bw for v in r['navigation'][nav]])}
  if bm>am*1.1 and bm-am>10:out['regressions'].append({'input':cp,'metric':'warm_'+nav,'data':g['navigation'][nav]})
 ac=next(r for r in a if r['iteration']=='cold')['e2e_ms'];bc=next(r for r in b if r['iteration']=='cold')['e2e_ms'];g['cold_e2e']={'baseline':ac,'candidate':bc}
 if bc>ac*1.2 and bc-ac>100:out['regressions'].append({'input':cp,'metric':'cold_e2e','data':g['cold_e2e']})
 g['target_gain_pass']=None if 'N2400' not in cp else g['metrics']['generation_ms']['saving_fraction']>=.2 and g['metrics']['generation_ms']['saving_ms']>=50 and g['metrics']['generation_ms']['wins']>=4
 out['groups'].append(g)
# Independent full semantic comparisons of all49 saved outputs; exclude only top-level savedAt.
def semantic(f):
 d=json.loads(f.read_text());d.pop('savedAt',None);return d
files=list((p/'timing/paired').glob('A-*-after.json'));out['full_json_pairs_equal']=sum(semantic(f)==semantic(f.with_name('B-'+f.name[2:])) for f in files);assert len(files)==49 and out['full_json_pairs_equal']==49
v=p/'timing/isolated-visual';vr=json.loads((v/'report.json').read_text());out['visual_report']=vr;out['visual_pairs']=[]
for f in sorted(v.glob('A-*.svg')):
 b=f.with_name('B-'+f.name[2:]);d={'checkpoint':f.stem[2:],'svg_equal':f.read_bytes()==b.read_bytes(),'png_equal':None};assert d['svg_equal']
 if f.with_suffix('.png').exists() and b.with_suffix('.png').exists():
  with Image.open(f.with_suffix('.png')) as x,Image.open(b.with_suffix('.png')) as y:
   d.update(size=list(x.size),png_equal=x.size==y.size and x.convert('RGBA').tobytes()==y.convert('RGBA').tobytes())
 else:d['limitation']='Full PNG missing after180s in both variants; visual acceptance blocked'
 out['visual_pairs'].append(d)
out.update(outcomes={k:sum(r['outcome']==k for r in rows) for k in set(r['outcome'] for r in rows)},browser_errors=sum(len(r['errors']) for r in rows),failed_requests=sum(len(r['failed_requests']) for r in rows),incomplete_selection_rows=sum(not r['selection_complete'] for r in rows),status='blocked_visual',performance_gate_pass=all(g['target_gain_pass'] for g in out['groups'] if g['target_gain_pass'] is not None) and not out['regressions'],full_acceptance=False,score_changed=False)
pathlib.Path('/tmp/hx30/analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ['visual_report','environment','groups']},indent=2))
for g in out['groups']:print(g['input'],json.dumps({m:{k:d[k] for k in ['saving_fraction','wins']}|{'A':d['baseline']['median'],'B':d['candidate']['median']} for m,d in g['metrics'].items()}))
