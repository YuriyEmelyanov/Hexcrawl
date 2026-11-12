import json, hashlib, pathlib, sys
P=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(__file__).parent
names=['baseline','mountain','undo','redo','levels','reload']
raw={n:(P/(n+'.json')).read_bytes() for n in names}
data={n:json.loads(v) for n,v in raw.items()}
def canon(x): return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
pairs=[('baseline','mountain'),('baseline','undo'),('mountain','redo'),('redo','levels'),('levels','reload')]
expected=[
 ['exportMetadata','hexes','saveRevision'],
 ['exportMetadata','saveRevision'],
 ['exportMetadata','saveRevision'],
 ['continentGridDensity','detailGridDensity','exportMetadata','planetView','saveRevision','viewport'],
 ['exportMetadata']]
comparisons=[]
for (a,b),keys in zip(pairs,expected):
 A,B=data[a],data[b]
 changed=sorted(k for k in set(A)|set(B) if A.get(k)!=B.get(k))
 assert set(A)==set(B), (a,b,'changed key set')
 assert changed==keys,(a,b,changed)
 comparisons.append(dict(before=a,after=b,changed_keys=changed,added_keys=[],removed_keys=[],
  hexes_equal=A['hexes']==B['hexes'],landmarks_equal=A['landmarks']==B['landmarks'],paths_equal=A['paths']==B['paths']))
base=data['baseline']
assert base['hexes']==[dict(q=-1,r=0,terrain='forest',name='',description=''),dict(q=1,r=-1,terrain='plains',name='',description=''),dict(q=0,r=1,terrain='coast',name='',description='')]
modified=json.loads(json.dumps(base['hexes']))
modified[1]['terrain']='mountain'
for name in names:
 d=data[name]
 assert d['hexes']==(base['hexes'] if name in ['baseline','undo'] else modified)
 assert d['landmarks']==base['landmarks'] and d['paths']==base['paths']
 assert d['mapInstanceId']==base['mapInstanceId']
assert base['landmarks'][0]['notes']=='Fixture note v1: preserve this text and anchor.'
assert base['landmarks'][0]['id']=='landmark_1'
assert [(p['q'],p['r'],p['offsetX'],p['offsetY']) for p in base['paths'][0]['points']]==[(-1,0,0,0),(0,0,0,0),(1,-1,0,0)]
for name in ['levels','reload']:
 assert data[name]['continentGridDensity']==37 and data[name]['detailGridDensity']==37
 assert data[name]['milesPerHex']==6
assert [data[n]['saveRevision'] for n in names]==[29,30,31,32,35,35]
expected_blob_shas={"baseline":"6a820a9a6f017ee6f9f542d3ebddf9031b575ab3","mountain":"931e0a0977d6880d1402d249061562c736455f18","undo":"618db1c439abd1821060bcc3c9c921ea1cb6e747","redo":"34ce14a4b48ab401874868bf5f82011d2a7b6eee","levels":"8f05d1b3eb6d7166fdb2a5115fe9f39fc64d633c","reload":"1289de15623bd3e03150053587a2853ca1735117"}
for n,b in raw.items():
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==expected_blob_shas[n],(n,'raw blob mismatch')
out={'status':'passed','algorithm':'Python parsed recursive equality; top-level key sets checked; all changes listed without global ignored-key filter','raws':[
 {'name':n,'byte_count':len(raw[n]),'sha256':hashlib.sha256(raw[n]).hexdigest(),'git_blob_sha':hashlib.sha1(b'blob '+str(len(raw[n])).encode()+b'\0'+raw[n]).hexdigest(),'parsed_canonical_sha256':hashlib.sha256(canon(data[n])).hexdigest()} for n in names],
 'comparisons':comparisons,'acceptance_checks':['exact_fixture_cells','single_cell_edit','undo_exact_content','redo_exact_content','landmark_all_fields_all_six','road_all_fields_all_six','map_instance_identity_all_six','level_settings_exact37','reload_all_fields_except_listed_exportMetadata','all_added_removed_changed_keys_reported'],
 'limitations':['Import not verified; no import payload supplied','Three-cell own fixture only','1.5/6/24 observed through UI; 1/6/12/24 not established','No river feature; road and coast only','RNG behavior not tested']}
(P/'comparison-output.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(out,ensure_ascii=False))
