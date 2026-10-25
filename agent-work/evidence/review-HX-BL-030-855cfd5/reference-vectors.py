import json,pathlib
vectors=json.loads(pathlib.Path('/workspace/scratch/bb71cea1fbf0/review-855cfd5/test/fixtures/rng-v3/vectors.json').read_text())
mask=(1<<32)-1
def draws(state):
    result=[]
    for _ in range(10):
        state=(state+0x6D2B79F5)&mask
        t=((state^(state>>15))*(state|1))&mask
        t=(t^((t+(((t^(t>>7))*(t|61))&mask))&mask))&mask
        result.append(((t^(t>>14))&mask)/(1<<32))
    return result
for seed,expected in vectors.items():
    for stream,initial in [('geography',int(seed)),('poi',int(seed)^0x9E3779B9)]:
        assert draws(initial)==expected[stream],(seed,stream)
print('Independent Python reference PASS: seeds0/1/max, ten geography/poi draws each')
