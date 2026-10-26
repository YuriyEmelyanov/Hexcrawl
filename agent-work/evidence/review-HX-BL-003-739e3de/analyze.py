import json,pathlib,statistics,math,collections,hashlib
from PIL import Image
root=pathlib.Path('/tmp/hx003-review-independent');p=root/'artifact/timing/paired';raw=json.loads((p/'raw.json').read_text());rows=raw['rows']
def q(v,f=.95):return sorted(v)[math.ceil(len(v)*f)-1]
def stats(v):return dict(n=len(v),min=min(v),median=statistics.median(v),max=max(v),p95=q(v))
result={'rows':len(rows),'errors':raw['errors'],'outcomes':dict(collections.Counter(r['outcome'] for r in rows)),'pairs':[],'groups':[],'svg_pairs':[],'png_pairs':[],'failed_requests':[],'selection_incomplete':sum(not r['selection_complete'] for r in rows)}
for a in sorted(p.glob('A-*-after.json')):
 b=a.with_name('B-'+a.name[2:]);x=json.loads(a.read_text());y=json.loads(b.read_text());x.pop('savedAt',None);y.pop('savedAt',None);assert x==y,a.name;result['pairs'].append(a.name)
for inp in dict.fromkeys(r['input'] for r in rows):
 groups={v:[r for r in rows if r['input']==inp and r['variant']==v and type(r['iteration']) is int] for v in ['baseline','candidate']}
 a,b=(groups[v] for v in groups);g={'input':inp,'N':(a[0]['before']['N'],a[0]['after']['N']),'generation':{v:stats([r['generation_ms'] for r in rr]) for v,rr in groups.items()},'generation_ratios':[y['generation_ms']/x['generation_ms'] for x,y in zip(a,b)],'e2e':{v:stats([r['e2e_ms'] for r in rr]) for v,rr in groups.items()},'nav':{}}
 for action in ['zoom','pan']:
  ns={v:[x for r in rr for x in r['navigation'][action]] for v,rr in groups.items()}
  g['nav'][action]={v:{'pooled':stats(ns[v]),'per_run_p95':[q(r['navigation'][action]) for r in rr],'over50':sum(x>50 for x in ns[v]),'over500':sum(x>500 for x in ns[v])} for v,rr in groups.items()}
 result['groups'].append(g)
for folder in ['paired','isolated-visual']:
 for a in sorted((root/'artifact/timing'/folder).glob('A-*.svg')):
  b=a.with_name('B-'+a.name[2:]);assert a.read_bytes()==b.read_bytes();result['svg_pairs'].append(folder+'/'+a.name)
for a in sorted((root/'artifact/timing/isolated-visual').glob('A-*.png')):
 b=a.with_name('B-'+a.name[2:]);x=Image.open(a).convert('RGBA');y=Image.open(b).convert('RGBA');assert x.size==y.size and x.tobytes()==y.tobytes();result['png_pairs'].append({'name':a.name,'size':x.size})
for r in rows:
 if r['failed_requests']:result['failed_requests'].append({k:r[k] for k in ['input','iteration','variant','failed_requests']})
(root/'independent-analysis.json').write_text(json.dumps(result,indent=2))
for g in result['groups']:
 print(g['input'],'gen',round(g['generation']['baseline']['median'],2),round(g['generation']['candidate']['median'],2),'ratios',[round(x,4) for x in g['generation_ratios']])
 for ac,n in g['nav'].items():print(ac,[(v,round(t['pooled']['p95'],3),round(statistics.median(t['per_run_p95']),3),t['over50'],t['over500'],round(t['pooled']['max'],2)) for v,t in n.items()])
print({k:len(result[k]) for k in ['pairs','svg_pairs','png_pairs']});print('incomplete_selection',result['selection_incomplete'])
