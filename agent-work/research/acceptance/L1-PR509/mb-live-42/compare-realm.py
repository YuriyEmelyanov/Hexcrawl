import collections, hashlib, json, sys
from pathlib import Path
files=[Path(x) for x in sys.argv[1:]]
before, edited, reopened=[json.loads(f.read_bytes()) for f in files]
assert {k for k in edited if edited[k]!=reopened[k]} <= {'savedAt'}
m=edited['map']
assert [k for k in m if before['map'][k]!=m[k]]==['tags']
a=before['map']['tags']['instances']; b=m['tags']['instances']
assert len(a)==len(b)
key=lambda t:(t['definitionId'],json.dumps(t['owner'],sort_keys=True))
a,b=[{key(t):t for t in group} for group in [a,b]]
assert a.keys()==b.keys()
diff=[(a[k],b[k]) for k in a if a[k]!=b[k]]
assert len(diff)==1
i,j=diff[0]
assert j['definitionId']=='mb.holding' and i['values'][0]==[7] and j['values'][0]==[1] and i['values'][1:]==j['values'][1:]
origin=m['kingdoms'][0]['origin']
area={(origin['q']+col-row//2,origin['r']+row) for row in range(12) for col in range(12)}
xy=lambda h:(h['q'],h['r'])
regs=m['regions']
cells={xy(h) for r in regs for h in r['hexes']}
assert area<=cells
counts=collections.Counter()
myths=[]
for r in regs:
    pois=dict(r['pointOfInterestKinds'])
    if r.get('centralPoiKind') and not r.get('suppressCentralPoi'):
        pois['%s,%s'%xy(r['centerHex'])]=r['centralPoiKind']
    for k,kind in pois.items():
        if tuple(map(int,k.split(','))) in area:
            counts[kind]+=1
            if kind=='myth': myths.append((r['id'],r['biomeLandType'],k))
assert counts['throne']==1 and sum(v for k,v in counts.items() if k.startswith('holding_'))==3
assert len(myths)==len({r for r,_,_ in myths})==6 and all(terrain=='wild' for _,terrain,_ in myths)
assert all(counts[k] in (3,4) for k in ['dwelling','sanctuary','monument','hazard','curse','ruins'])
assert all(1<=r['targetSize']<=12 for r in regs)
obs=m['obstacles'];assert len(obs)==len({o['edgeKey'] for o in obs})==24
def adjacent(a,b):
    q,r=xy(a); x,y=xy(b)
    return max(abs(q-x),abs(r-y),abs(q+r-x-y))==1
assert all(adjacent(o['hex'],o['neighborHex']) for o in obs)
tags=m['tags']['instances']
owners=lambda kind:{json.dumps(t['owner'],sort_keys=True) for t in tags if t['definitionId']==kind}
assert owners('mb.sanctum')==owners('mb.seer') and len(owners('mb.seer'))==3
print(json.dumps(dict(sha256=[hashlib.sha256(f.read_bytes()).hexdigest() for f in files],regions=len(regs),area=len(area),generated_cells=len(cells),counts=counts,myths=myths,barriers=len(obs),matched_sanctum_seer=3,first_region=[regs[0]['targetSize'],regs[0]['finalSize']],ruin_tags=len(owners('mb.ruin')),edited_owner=j['owner'],roll_before=i['values'],roll_after=j['values'],reopened_equal_except_timestamp=True),ensure_ascii=False))
