import hashlib, json, zipfile, xml.etree.ElementTree as E
from pathlib import Path
from PIL import Image, ImageChops
here=Path(__file__).resolve().parent; parent=here.parent
archive=parent/'WR1-final.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='b18b814747fb3f093979bc4909c2bf82a403c37c0ee38ac4e5b31f37335c9ce7'
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  if not name.endswith('/'): assert (parent/'wr1-actual'/name).read_bytes()==z.read(name),name
for width in [1500,390]:
 a=Image.open(parent/f'wr1-actual/native6-before-{width}.png').convert('RGBA');b=Image.open(parent/f'wr1-actual/native6-after-{width}.png').convert('RGBA')
 assert a.size==b.size and ImageChops.difference(a,b).getbbox() is None
x=json.loads((parent/'wr1-actual/manifest.json').read_text())['rendered_geometry'];root=E.parse(here/'actual-component.svg').getroot();N={'s':'http://www.w3.org/2000/svg'}
rs=root.findall('.//s:g[@class="rivers-layer"]/s:line',N);roads=root.findall('.//s:g[@class="roads-layer"]//s:line',N);rails=root.findall('.//s:g[@class="roads-layer"]//s:polyline',N)
assert len(rs)==53 and len(roads)==36 and len(rails)==len(x['paint']['rails'])==6
ox=float(x['rivers'][0][0])-float(rs[0].get('x1'));oy=float(x['rivers'][0][1])-float(rs[0].get('y1'))
for nodes,rows in [(rs,x['rivers']),(roads,x['roads'])]:
 for n,row in zip(nodes,rows):
  for k,v in zip(['x1','y1','x2','y2'],row):assert abs(float(n.get(k))+(ox if k[0]=='x' else oy)-float(v))<1e-7
for n,w in zip(rs,x['paint']['riverWidths']):assert abs(float(n.get('stroke-width'))-float(w))<1e-9
for n,row in zip(roads,x['paint']['roadPaint']):
 for k,v in zip(['opacity','stroke-width','stroke-dasharray'],row):assert n.get(k)==v
for n,row in zip(rails,x['paint']['rails']):
 for a,b in zip(n.get('points').split(),row.split()):
  p=list(map(float,a.split(',')));q=list(map(float,b.split(',')));assert abs(p[0]+ox-q[0])<1e-7 and abs(p[1]+oy-q[1])<1e-7
print('PASS: remote-digest ZIP bytes; native6 1500/390 pixels; exactSSR river/road/rail parity')
