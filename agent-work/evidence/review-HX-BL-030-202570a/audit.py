import json,re,pathlib
base=pathlib.Path('/workspace/scratch/bb71cea1fbf0')
s=json.loads((base/'ops-review-202570a/agent-work/score/current-score.json').read_text());c=s['criteria'];assert len(c)==50 and len({x['criterion_id'] for x in c})==50;assert sum(x['weight'] for x in c)==1000
for x in c:
 if x['grade'] is not None: assert x['points']==x['weight']*[0,.25,.5,.75,1][x['grade']]
assert sum(x.get('points') or 0 for x in c)==186.25
assert sum(x['weight'] for x in c if x['grade'] is None)==70
model=(base/'review-202570a/docs/strategy/score-model.md').read_text(); rows=re.findall(r'^\| (S\d\d-C\d\d) \|[^\n]*?\| (\d+) \|',model,re.M);assert len(rows)==50;assert dict(rows)=={x['criterion_id']:str(x['weight']) for x in c}
print('Score1.1 audit PASS: 50 unique criteria; weights1000; G0..G4 coefficients; confirmed186.25; unverified70; registry matches model weights')
p=base/'review-202570a/test/fixtures/rng-v3/vectors.json';v=json.loads(p.read_text());print('Vector shape',list(v))
def draws(state):
 out=[]
 for _ in range(10):
  state=(state+0x6D2B79F5)&0xffffffff
  a=((state^(state>>15))*(state|1))&0xffffffff
  b=((a^(a>>7))*(a|61))&0xffffffff
  a=(a^((a+b)&0xffffffff))&0xffffffff
  out.append(((a^(a>>14))&0xffffffff)/2**32)
 return out
for seed,expected in v.items():
 assert expected['geography']==draws(int(seed));assert expected['poi']==draws(int(seed)^0x9e3779b9)
print('Independent Python uint32 reference PASS: seeds0,1,max; 10 draws both streams')
