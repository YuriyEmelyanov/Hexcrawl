"""Offline synthetic analyzer regression checks; no browser, actual map or PNG export."""
import json,pathlib,subprocess,tempfile,unittest
SCRIPT=pathlib.Path(__file__).with_name('hx-bl-003-v2-analyze.py')
def fixture():
    rows=[]
    for name in ['mythic-0-N1200.json','mythic-0-N2400.json']:
        for i in ['warmup',0,1,2,3,4]:
            for v in ['A','B'] if i=='warmup' or i%2==0 else ['B','A']:
                rows.append(dict(input=name,variant=v,iteration=i,status='success',navigation=dict(zoom=[20]*24,pan=[20]*24)))
    return dict(nav=rows,png=[])
def analyze(raw):
    with tempfile.TemporaryDirectory() as tmp:
        p=pathlib.Path(tmp)/'reports/HX-BL-003/v2';p.mkdir(parents=True)
        (p/'raw.json').write_text(json.dumps(raw))
        subprocess.run(['python',str(SCRIPT)],cwd=tmp,check=True,stdout=subprocess.DEVNULL)
        return json.loads((p/'summary.json').read_text())
class Completeness(unittest.TestCase):
    def assert_incomplete(self,raw):
        s=analyze(raw)
        self.assertEqual(s['navigation'][0]['status'],'incomplete_inconclusive')
        self.assertEqual(s['navigation'][0]['variants']['A']['pooled']['n'],120,'retain measured statistics')
    def test_success(self):
        s=analyze(fixture());self.assertTrue(all(g['status']=='bounded_guard_pass' for g in s['navigation']))
    def test_failed_warmup(self):
        r=fixture();r['nav'][0]['status']='error';self.assert_incomplete(r)
    def test_missing_warmup(self):
        r=fixture();r['nav'].pop(0);self.assert_incomplete(r)
    def test_warmup_after_measurements(self):
        r=fixture();r['nav'].append(r['nav'].pop(0));self.assert_incomplete(r)
    def test_bad_warmup_frames(self):
        r=fixture();r['nav'][0]['navigation']['zoom'].pop();self.assert_incomplete(r)
    def test_duplicate_measured_iteration(self):
        r=fixture();r['nav'][4]['iteration']=0;self.assert_incomplete(r)
    def test_guard_thresholds_unchanged(self):
        r=fixture()
        for row in r['nav']:
            if row['variant']=='B':row['navigation']['zoom']=[30]*24
        self.assertEqual(analyze(r)['navigation'][0]['status'],'bounded_guard_pass','exact10ms is not >10ms')
        for row in r['nav']:
            if row['variant']=='B':row['navigation']['zoom']=[31]*24
        s=analyze(r);self.assertEqual(s['navigation'][0]['status'],'nonpassing');self.assertEqual(s['navigation'][0]['variants']['B']['pooled']['p95'],31)
if __name__=='__main__':unittest.main()
