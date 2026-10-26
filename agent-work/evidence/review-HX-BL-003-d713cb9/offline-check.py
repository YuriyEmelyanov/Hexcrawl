import json,pathlib,hashlib,ast,subprocess,tempfile,shutil
root=pathlib.Path('/tmp/hx003-review-resume/hex');e=pathlib.Path('/tmp/hx003-review-resume/evidence');r=json.loads((e/'artifact/raw.json').read_text());s=json.loads((e/'artifact/summary.json').read_text())
assert len(r['nav'])==24 and len(r['png'])==4
assert all(x['status']=='not_executed' for x in r['nav']+r['png'])
assert not r['measurement_started']
assert s['counts']=={'measured_actions_attempted':0,'warmups_attempted':0,'png_click_attempts':0}
for f in json.loads((e/'artifact/artifacts-manifest.json').read_text()):
 b=(e/'artifact'/f['path']).read_bytes();assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256']
for f in r['environment']['files']:
 assert hashlib.sha256((root/f['path']).read_bytes()).hexdigest()==f['sha256']
assert not subprocess.check_output(['git','diff','739e3de','d713cb9','--','src','public','package.json','package-lock.json'],cwd=root)
for script in ['scripts/hx-bl-003-v2.mjs','scripts/hx-bl-003-v2-probes.js']:
 subprocess.run(['node','--check',str(root/script)],check=True)
ast.parse((root/'scripts/hx-bl-003-v2-analyze.py').read_text())
# Run pure analyzer in isolated temporary directory with synthetic data only, no browser.
with tempfile.TemporaryDirectory() as td:
 p=pathlib.Path(td)/'reports/HX-BL-003/v2';p.mkdir(parents=True)
 (p/'raw.json').write_text(json.dumps(r))
 subprocess.run(['python',str(root/'scripts/hx-bl-003-v2-analyze.py')],cwd=td,check=True,stdout=subprocess.DEVNULL)
 assert json.loads((p/'summary.json').read_text())==s
 for row in r['nav']:
  row['status']='error' if row['iteration']=='warmup' else 'success'
  if row['iteration']!='warmup':row['navigation']={'zoom':[20]*24,'pan':[20]*24}
 (p/'raw.json').write_text(json.dumps(r))
 subprocess.run(['python',str(root/'scripts/hx-bl-003-v2-analyze.py')],cwd=td,check=True,stdout=subprocess.DEVNULL)
 syn=json.loads((p/'summary.json').read_text());assert all(x['status']=='bounded_guard_pass' for x in syn['navigation'])
 (e/'synthetic-warmup-failure-summary.json').write_text(json.dumps(syn,indent=2))
 print('PASS artifact manifest/source hashes; zero actions; runtime parity; JS/Python syntax; exact raw summary recomputation.')
 print('CONFIRMED analyzer returns 4 bounded_guard_pass groups despite all 4 warmups error. Synthetic only, no measured actions.')
