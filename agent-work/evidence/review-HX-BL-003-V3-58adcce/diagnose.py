import json,gzip,pathlib,hashlib,math,statistics,collections,copy
p=pathlib.Path('/tmp/hx003-v3-validation');o=pathlib.Path('/tmp/review-v3-result-58adcce');r=json.loads((p/'raw.json').read_text());out={}
def sha(b):return hashlib.sha256(b).hexdigest()
manifest=json.loads((p/'artifacts-manifest.json').read_text())['files'];out['manifest']={'entries':len(manifest),'failures':[f['path'] for f in manifest if len((p/f['path']).read_bytes())!=f['bytes'] or sha((p/f['path']).read_bytes())!=f['sha256']]}
def stats(a):
 s=sorted(a);return {'n':len(a),'rank':math.ceil(.95*len(a)),'p95':s[math.ceil(.95*len(a))-1],'max':max(a),'over50':sum(x>50 for x in a)/len(a),'over500':sum(x>500 for x in a)/len(a)}
out['navigation']={}
for phase in ['zoom','pan']:
 d={}
 for v in ['A','B']:
  rows=[x for x in r['nav'] if x['kind']=='measured' and x['variant']==v];a=[x for row in rows for x in row['navigation'][phase]];assert len(a)==240 and all(math.isfinite(x) for x in a)
  d[v]={'pooled':stats(a),'position':{i:stats([x for row in rows if row['position']==i for x in row['navigation'][phase]]) for i in [1,2]},'median_peraction_p95':statistics.median(stats(row['navigation'][phase])['p95'] for row in rows)}
 a,b=d['A']['pooled']['p95'],d['B']['pooled']['p95'];d.update(delta_ms=b-a,ratio=b/a,guard_breach=b-a>10 and b>1.1*a);out['navigation'][phase]=d
out['order']=[x['variant'] for x in r['nav']];assert out['order']==list('ABABBAABBAABBAABBAABBAAB')
def decode(v):
 tag=v[0]
 if tag=='Object':return {k:decode(x) for k,x in v[1]}
 if tag=='Array':return [decode(x) for x in v[1]]
 if tag in ['Map','Set']:return (tag,v[1]) # retain every typed encoded entry, order and value
 if tag=='null':return None
 if tag=='undefined':return ('undefined',)
 return v[1]
def read(h,s):
 b=gzip.decompress((p/(h['id']+'-'+s+'.native.json.gz')).read_bytes());assert sha(b)==h['snapshots'][s]['sha256'];return decode(json.loads(b))
def eq(a,b):assert a==b
out['history']=[]
for h in r['history']:
 ss={s:read(h,s) for s in h['snapshots']};P,S0=ss['P'],ss['S0'];eq(P['undo'],[]);eq(P['redo'],[]);eq(S0['undo'],[{'before':P['document'],'after':S0['document']}]);eq(S0['redo'],[])
 def commit(a,b):eq(b['undo'],(a['undo']+[{'before':a['document'],'after':b['document']}])[-100:]);eq(b['redo'],[])
 def ur(a,b,prefix):
  u=ss[prefix+'-undo'];eq(u['document'],a['document']);eq(u['generation'],a['generation']);eq(u['undo'],b['undo'][:-1]);eq(u['redo'],b['redo']+[b['undo'][-1]]);eq(ss[prefix+'-redo'],b)
 S1=ss['S1'];commit(S0,S1);ur(S0,S1,'first');I0=ss['I0'];eq(I0['document'],S0['document']);eq(I0['generation'],S0['generation']);commit(S1,I0)
 if 'I1' in ss:
  I1=ss['I1'];eq(I1['document'],S1['document']);eq(I1['generation'],S1['generation']);commit(I0,I1);ur(I0,I1,'reimport')
  for i,sel in enumerate(h['selection'],1):
   exp=copy.deepcopy(I1);exp['document']['selectedHex']=sel['selectedHex'];eq(ss['selection-'+str(i)],exp);assert sel['visible']
  def sem(name):d=json.loads((p/(h['id']+'-'+name+'.json')).read_text());d.pop('savedAt',None);return d
  eq(sem('J1'),sem('I1-save'));e=sem('I1-save');e['ui']['selectedHex']=h['selection'][-1]['selectedHex'];eq(sem('selected'),e)
 out['history'].append({'id':h['id'],'status':h['status'],'verified_native_snapshots':len(ss),'local_available_transitions_verified':True,'selections':len(h.get('selection',[]))})
def startup(P):
 v=copy.deepcopy(P);g=v['generation'];s=g['masterSeed'];assert 0<=s<=0xffffffff and int(s)==s;eq(g,v['document']['map']['generation']);eq(g['streams']['geography'],s);eq(g['streams']['poi'],s^0x9e3779b9);eq(v['document']['map']['toponymSeed'],s^0x85ebca6b)
 for rng in [v['generation'],v['document']['map']['generation']]:rng['masterSeed']=0;rng['streams']['geography']=0;rng['streams']['poi']=0
 v['document']['map']['toponymSeed']=0;return v
out['cross_variant']=[]
for i in [0,1]:
 a,b=r['history'][2*i:2*i+2];pa,pb=read(a,'P'),read(b,'P');eq(startup(pa),startup(pb));common=list(set(a['snapshots'])&set(b['snapshots']));
 for s in common:
  if s=='P':continue
  va,vb=read(a,s),read(b,s)
  for v,P in [(va,pa),(vb,pb)]:eq(v['undo'][0]['before'],P['document']);v['undo'][0]['before']={'P_reference':'validated'}
  eq(va,vb)
 for s in ['J0','J1']+(['I1-save'] if i==0 else []):
  da=json.loads((p/(a['id']+'-'+s+'.json')).read_text());db=json.loads((p/(b['id']+'-'+s+'.json')).read_text());da.pop('savedAt',None);db.pop('savedAt',None);eq(da,db)
 out['cross_variant'].append({'input_index':i,'available_native_steps_equal':sorted(common),'complete':i==0,'comparison':'validated startup entropy exception only; all other typed contents exact'})
out['lifecycle']=r['browser_lifecycle'];out['raw_errors']=r['errors'];out['trace']={}
for row in r['nav'][-2:]:
 es=json.loads((p/('nav-'+str(row['id'])+'-trace.json')).read_text())['traceEvents'];names=collections.Counter(e['name'] for e in es);ph=collections.Counter(e['event_kind'] for e in row['phase_events']);out['trace'][row['variant']]={'events':len(es),'event_names':dict(names.most_common(25)),'phase_event_kinds':dict(ph),'limits':row['phase_limits'],'navigation_marks':row['navigation']['marks'],'max_rAF_ms':{k:max(row['navigation'][k]) for k in ['zoom','pan']}}
(o/'diagnostics.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['lifecycle','raw_errors','trace']},indent=2))
