from pathlib import Path
import urllib.request,re,hashlib,json,datetime
root=Path('/workspace/scratch/320e5b03f904/rollui2-runtime/dist')
out=Path('/workspace/scratch/320e5b03f904/output/release-PR495')
url='https://app.hexcrawl.ru/'
def read(u):
    r=urllib.request.urlopen(u,timeout=30)
    assert r.status==200
    return r.read()
html=read(url+'?release=PR495').decode()
assets=re.findall(r'(?:src|href)="(/assets/[^" ]+)"',html)
assert any(a.endswith('.js') for a in assets)
checks=[]
for asset in assets:
    local=root/asset.lstrip('/')
    assert local.is_file(), 'Unexpected deployed asset '+asset
    body=read(url.rstrip('/')+asset)
    actual=hashlib.sha256(body).hexdigest()
    expected=hashlib.sha256(local.read_bytes()).hexdigest()
    assert actual==expected, (asset,actual,expected)
    checks.append({'path':asset,'bytes':len(body),'sha256':actual,'matches_accepted_runtime_build':True})
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'live_url':url,
        'html_http':200,'assets':checks,'head_sha':'12e65a09c8f93e39ce020cc6a919ec67d6979216',
        'accepted_tree':'b0b2a17aa8b08cfeaa5cb73e20f6011566af9886','all_match':True,
        'method':'Live HTML references and exact SHA256 equality with accepted Node24 build. Python HTTPS validation default; browser TLS assertion recorded separately.'}
(out/'live-assets.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
