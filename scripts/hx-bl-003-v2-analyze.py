import json,math,pathlib,hashlib
from PIL import Image,ImageChops
Image.MAX_IMAGE_PIXELS=None
p=pathlib.Path('reports/HX-BL-003/v2')
r=json.loads((p/'raw.json').read_text())
def stats(xs):
    if not xs or not all(isinstance(x,(int,float)) and math.isfinite(x) for x in xs): return None
    s=sorted(xs)
    return dict(n=len(xs),min=s[0],max=s[-1],p95=s[math.ceil(.95*len(s))-1],median=s[len(s)//2] if len(s)%2 else (s[len(s)//2-1]+s[len(s)//2])/2,over50=sum(x>50 for x in xs),over500=sum(x>500 for x in xs),over50_fraction=sum(x>50 for x in xs)/len(xs),over500_fraction=sum(x>500 for x in xs)/len(xs))
summary={'protocol':'P1-V2/addendum1.0','unit':'ms','nesting':'120 frames nested in five measured actions; not 120 independent repetitions','navigation':[],'png':[]}
for name in ['mythic-0-N1200.json','mythic-0-N2400.json']:
    for phase in ['zoom','pan']:
        group={'input':name,'phase':phase,'variants':{}}
        for variant in ['A','B']:
            indexed=[(i,x) for i,x in enumerate(r['nav']) if x['input']==name and x['variant']==variant]
            warmups=[(i,x) for i,x in indexed if x['iteration']=='warmup']
            measured=[(i,x) for i,x in indexed if type(x['iteration']) is int]
            rows=[x for _,x in measured]
            frames=[v for x in rows for v in x.get('navigation',{}).get(phase,[])]
            protocol_errors=[]
            if len(warmups)!=1: protocol_errors.append('exactly_one_warmup_required')
            else:
                wi,warm=warmups[0]
                if warm['status']!='success': protocol_errors.append('warmup_not_successful')
                warmframes=warm.get('navigation',{}).get(phase,[])
                if len(warmframes)!=24 or stats(warmframes) is None: protocol_errors.append('warmup_frames_incomplete')
                if any(i<=wi for i,_ in measured): protocol_errors.append('warmup_must_precede_measured_actions')
            if [x['iteration'] for x in rows]!=list(range(5)): protocol_errors.append('measured_iteration_order_invalid')
            complete=not protocol_errors and len(rows)==5 and all(x['status']=='success' and len(x.get('navigation',{}).get(phase,[]))==24 for x in rows) and len(frames)==120 and stats(frames) is not None
            per=[{'iteration':x['iteration'],'status':x['status'],'stats':stats(x.get('navigation',{}).get(phase,[]))} for x in rows]
            group['variants'][variant]={'complete':complete,'protocol_errors':protocol_errors,'warmups':[dict(position=i,status=x['status']) for i,x in warmups],'pooled':stats(frames),'per_run':per,'median_per_run_p95':stats([x['stats']['p95'] for x in per if x['stats']])['median'] if all(x['stats'] for x in per) and len(per)==5 else None}
        if all(v['complete'] for v in group['variants'].values()):
            a,b=[group['variants'][v]['pooled']['p95'] for v in ['A','B']]
            group.update(delta_ms=b-a,relative_delta=(b-a)/a if a else None,guard_breach=b-a>10 and b>1.1*a,status='nonpassing' if b-a>10 and b>1.1*a else 'bounded_guard_pass')
            group['paired']=[{'iteration':i,'A_p95':group['variants']['A']['per_run'][i]['stats']['p95'],'B_p95':group['variants']['B']['per_run'][i]['stats']['p95']} for i in range(5)]
            for pair in group['paired']: pair.update(delta_ms=pair['B_p95']-pair['A_p95'],ratio=pair['B_p95']/pair['A_p95'] if pair['A_p95'] else None)
        else: group['status']='incomplete_inconclusive'
        summary['navigation'].append(group)
for name in ['mythic-0-N2400-after','mythic-123456789-N2400-after']:
    item={'input':name,'status':'blocked_missing_png'}
    a,b=[p/(v+'-'+name+'.png') for v in ['A','B']]
    if a.exists() and b.exists():
        with Image.open(a) as x,Image.open(b) as y:
            item['A_size']=x.size;item['B_size']=y.size
            item['pixels_equal']=x.size==y.size and ImageChops.difference(x.convert('RGBA'),y.convert('RGBA')).getbbox(alpha_only=False) is None
            item['status']='pixels_equal' if item['pixels_equal'] else 'fail_different_pixels'
    summary['png'].append(item)
summary['counts']={'measured_actions_attempted':sum(isinstance(x['iteration'],int) and x['status']!='not_executed' for x in r['nav']),'warmups_attempted':sum(x['iteration']=='warmup' and x['status']!='not_executed' for x in r['nav']),'png_click_attempts':sum(x['attempted'] for x in r['png'])}
assert summary['counts']['measured_actions_attempted']<=20 and summary['counts']['warmups_attempted']<=4 and summary['counts']['png_click_attempts']<=4
summary['full_product_acceptance']=False
summary['unresolved']='Original CI/safety/selection findings require independent review; bounded pass alone does not accept whole product.'
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
files=[{'path':str(f.relative_to(p)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.rglob('*')) if f.is_file() and f.name!='artifacts-manifest.json']
(p/'artifacts-manifest.json').write_text(json.dumps(files,indent=2)+'\n')
print(json.dumps(summary,indent=2))
