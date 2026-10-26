import json,hashlib,math,statistics,zipfile,tempfile,gc,collections,datetime
from pathlib import Path
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
P=Path('/tmp/hx003-run40388046863/artifact'); O=Path('/tmp/review-86100-v2'); S=O/'source'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  while b:=f.read(2**20):h.update(b)
 return h.hexdigest()
def dump(n,d):(O/n).write_text(json.dumps(d,indent=2)+'\n')
zpath=P.parent/'artifact.zip';zh=sha(zpath)
assert zpath.stat().st_size==162310969 and zh=='c729258618dd5251709b1417508229684bea8725c07a000bc0bedb7b147b5f04'
zip_verified=[]
with zipfile.ZipFile(zpath) as z:
 for n in z.namelist():
  if n.endswith('/'):continue
  assert not n.startswith('/') and '..' not in Path(n).parts
  h=hashlib.sha256()
  with z.open(n) as f:
   while b:=f.read(2**20):h.update(b)
  assert h.hexdigest()==sha(P/n)
  zip_verified.append(n)
manifest=json.load(open(P/'artifacts-manifest.json'));verified=[]
for f in manifest:
 assert sha(P/f['path'])==f['sha256'] and (P/f['path']).stat().st_size==f['bytes'];verified.append(f['path'])
e=json.load(open(P/'environment.json'));r=json.load(open(P/'raw.json'))
assert r['environment']==e
# Tool content was saved with one additional LF by apply_patch; remove only a demonstrably extra transport LF.
known={f['path']:f['sha256']for f in e['files']}
pre=json.load(open(S/'reports/HX-BL-003/v2-protocol-manifest.json'))
known.update({f['path']:f['sha256']for f in pre['files']});known['package-lock.json']=e['lock_sha256']
for p in S.rglob('*'):
 if p.is_file() and str(p.relative_to(S)) in known:
  expected=known[str(p.relative_to(S))];b=p.read_bytes()
  if hashlib.sha256(b).hexdigest()!=expected:
   assert hashlib.sha256(b[:-1]).hexdigest()==expected;p.write_bytes(b[:-1])
m=json.load(open(S/'reports/HX-BL-003/v2-protocol-manifest.json'));sv=[]
for f in e['files']+m['files']:
 assert sha(S/f['path'])==f['sha256'],f['path'];sv.append(f['path'])
assert sha(S/'package-lock.json')==e['lock_sha256']
assert e['harness_sha']==r['harness_sha']=='86100c390d8d4cf66cee6e87589be64ce51687e5'
assert e['vcpus']==4 and 15*1024**3 <=e['ram_bytes']<=18*1024**3
assert e['node'].startswith('v24.') and e['playwright']=='1.62.1' and e['chromium_version']=='151.0.7922.34'
assert e['created_at']<r['nav'][0]['started_at']
inputs=['mythic-0-N1200.json','mythic-0-N2400.json'];plan=[(inp,it,v)for inp in inputs for it in ['warmup',0,1,2,3,4] for v in (['A','B'] if it=='warmup' or it%2==0 else ['B','A'])]
assert [(x['input'],x['iteration'],x['variant'])for x in r['nav']]==plan
assert all(x['status']=='success' and x['before']['json_equal'] for x in r['nav'])
def stats(a):
 assert a and all(isinstance(x,(float,int))and math.isfinite(x)and x>=0 for x in a)
 return dict(n=len(a),p95=sorted(a)[math.ceil(.95*len(a))-1],min=min(a),max=max(a),median=statistics.median(a),over50=sum(x>50 for x in a),over500=sum(x>500 for x in a),over50_fraction=sum(x>50 for x in a)/len(a),over500_fraction=sum(x>500 for x in a)/len(a))
for x in r['nav']:
 for phase in ['zoom','pan']:
  n=x['navigation'];assert len(n[phase])==len(n[phase+'_timestamps'])==24
  ts=[n[phase+'_initial_timestamp']]+n[phase+'_timestamps']
  assert all(abs((ts[i+1]-ts[i])-n[phase][i])<1e-7 for i in range(24));stats(n[phase])
nav=[]
for inp in inputs:
 for phase in ['zoom','pan']:
  d=dict(input=inp,phase=phase,variants={})
  for v in ['A','B']:
   rows=[x for x in r['nav'] if x['input']==inp and x['variant']==v and x['iteration']!='warmup'];a=[f for x in rows for f in x['navigation'][phase]];assert len(a)==120
   pr=[dict(iteration=x['iteration'],**stats(x['navigation'][phase]))for x in rows];d['variants'][v]=dict(pooled=stats(a),per_run=pr,median_per_run_p95=statistics.median(x['p95']for x in pr),min_per_run_p95=min(x['p95']for x in pr),max_per_run_p95=max(x['p95']for x in pr),import_settle_ms=[x['before']['import_and_settle_ms']for x in rows])
  a,b=[d['variants'][v]['pooled']['p95']for v in ['A','B']];d.update(delta_ms=b-a,relative_delta=(b/a-1)if a else None,guard_breach=b-a>10 and b>1.1*a)
  d['paired']=[dict(iteration=i,order='AB'if i%2==0 else'BA',A_p95=d['variants']['A']['per_run'][i]['p95'],B_p95=d['variants']['B']['per_run'][i]['p95'],delta_ms=d['variants']['B']['per_run'][i]['p95']-d['variants']['A']['per_run'][i]['p95'],ratio=d['variants']['B']['per_run'][i]['p95']/d['variants']['A']['per_run'][i]['p95']) for i in range(5)]
  nav.append(d)
png=[]
assert [(x['input'],x['variant'])for x in r['png']]==[(inp+'.json',v)for inp in ['mythic-0-N2400-after','mythic-123456789-N2400-after']for v in ['A','B']]
assert all(x['attempted'] and x['status']=='captured'for x in r['png'])
for stem in ['mythic-0-N2400-after','mythic-123456789-N2400-after']:
 d=dict(input=stem,images=[],method='One source image resident at a time; decode to RGBA in 32-row strips; write A strips to temporary file; byte-compare every B strip against A. Hash is additional only.');count=0
 with tempfile.TemporaryFile()as tmp:
  for v in ['A','B']:
   p=P/(v+'-'+stem+'.png');h=hashlib.sha256()
   with Image.open(p)as im:
    w,hh=im.size;size=im.size
    if v=='A':first=size
    else:assert size==first;tmp.seek(0)
    for y in range(0,hh,32):
     b=im.crop((0,y,w,min(y+32,hh))).convert('RGBA').tobytes();h.update(b)
     if v=='A':tmp.write(b)
     else:assert tmp.read(len(b))==b;count+=len(b)
    if v=='B':assert tmp.read(1)==b''
   del im;gc.collect()
   d['images'].append(dict(variant=v,width=w,height=hh,file_sha256=sha(p),rgba_sha256=h.hexdigest(),rgba_bytes=w*hh*4))
   print('DECODED',stem,v,w,hh,h.hexdigest(),flush=True)
 d.update(full_decoded_rgba_equal=True,compared_bytes=count);png.append(d)
events=collections.Counter(x['type']for row in r['png']for x in row['events']);err=[x for row in r['png']for x in row['events']if x['type'] in ['requestfailed','pageerror','dialog','page_crash']]
life=r['browser_lifecycle'];assert sum(x['type']=='browser_spawn'for x in life)==sum(x['type']=='browser_exit_confirmed'for x in life)==5
counts=dict(measured_navigation=20,warmups=4,png_attempts=4,nav_success=24,total_measured_frames=960)
out=dict(completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),archive_sha256=zh,archive_bytes=zpath.stat().st_size,zip_members_verified=zip_verified,manifest_entries_verified=verified,exact_source_hashes_verified=sv,environment=e,counts=counts,navigation=nav,png=png,png_event_counts=dict(events),error_events=err,raw_errors=r['errors'],browser_lifecycle=life)
dump('offline-result.json',out);print('COMPLETE',counts,[(x['input'],x['phase'],x['guard_breach'])for x in nav],flush=True)
