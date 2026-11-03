from pathlib import Path
import subprocess
p=Path('/workspace/root-review-485/src/App.tsx');old=p.read_text();needle='return preferred&&existing.has(hexKey(preferred))&&touches(preferred)?preferred:sorted.find(touches)??null;';assert needle in old
try:
 p.write_text(old.replace(needle,'return preferred&&existing.has(hexKey(preferred))?preferred:sorted.find(touches)??null;'))
 r=subprocess.run(['node','--test','--test-name-pattern=direct names change only','test/mapTransactions.test.mjs'],cwd='/workspace/root-review-485',capture_output=True,text=True)
 Path('/workspace/root-review-485-evidence/sensitivity.log').write_text(r.stdout+r.stderr)
 print('mutation_exit_code',r.returncode)
finally:p.write_text(old)
