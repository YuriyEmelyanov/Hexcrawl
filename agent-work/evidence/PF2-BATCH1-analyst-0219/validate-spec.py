from pathlib import Path
import json,re,math,xml.etree.ElementTree as ET
from PIL import Image,ImageFont
p=Path(__file__).parent
manifest=json.loads((p/'PF2-BATCH1-content-v1.json').read_text())
source=Path('/tmp/tables1-independent-9cf/src/App.tsx').read_text()
biomes=set(re.findall(r"'([^']+)'",source.split('type BiomeId =',1)[1].split(';',1)[0]))
mapped=[b for rows in manifest['contexts'].values() for b in rows]
assert len(mapped)==len(set(mapped))==24 and set(mapped)==biomes
assert len(manifest['entries'])==17 and len({x['id'] for x in manifest['entries']})==17
for g in [*manifest['contexts'],'aquatic']:
 for c in ['landmark','secret','resource']:
  assert any(x['category']==c and x['context'] in [g,'land' if g!='aquatic' else g] for x in manifest['entries'])
for e in manifest['entries']:
 assert e['authorship']=='project_authored_seed_not_book_quotation'
 assert all(e[k][l] and len(e[k][l])<=20000 for k in ['title','description'] for l in ['ru','en'])
counts={c:0 for c in ['landmark','secret','resource','standard']}
for d in range(1,21):counts['landmark' if d<=3 else 'secret' if d<=6 else 'resource' if d<=9 else 'standard']+=1
assert list(counts.values())==[3,3,3,11]
assert [v*5 for v in counts.values()]==[15,15,15,55]
assert [v*15 for v in counts.values()]==[45,45,45,165]
width=12*math.sqrt(3)/2
assert abs(width*2/math.sqrt(3)-12)<1e-9 and abs(12*1.609344-19.312128)<1e-9
spec=(p/'HX-BL-054-PF2-BATCH1.md').read_text()
assert len(set(re.findall(r'\| (P\d+) \|',spec)))==18
assert all(x in spec for x in ['opposite_vertices','6√3','unknown','PF2-RM-002-L1','013-L1','029-L1','v13','Finish/Discard/Stay'])
text_bounds=[];pngs=[]
for f in p.glob('preview-*.svg'):
 root=ET.parse(f).getroot();w=float(root.attrib['width']);h=float(root.attrib['height'])
 for t in root.iter('{http://www.w3.org/2000/svg}text'):
  size=int(t.attrib['font-size']);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if t.attrib.get('font-weight')=='700' else '')+'.ttf',size)
  s=''.join(t.itertext());x=float(t.attrib['x']);y=float(t.attrib['y']);length=font.getlength(s)
  assert x>=0 and x+length<=w+1 and 0<y<h,(f.name,s,x+length,w)
 im=Image.open(f.with_suffix('.png'));assert im.size==(int(w),int(h));im.verify();pngs.append({'file':f.with_suffix('.png').name,'width':int(w),'height':int(h),'text_within_canvas':True})
report={'kind':'analyst_static_artifact_validation_not_product_runtime_test','status':'passed','biome_ids_source_sha':'9cf202e4c311445ac7d4cd752cf6e5f088775a36','biome_ids_mapped':24,'catalog_entries':17,'category_context_coverage':'all six land groups plus aquatic have all three feature categories','acceptance_rows':18,'fixed_distributions':{'100':[15,15,15,55],'300':[45,45,45,165]},'physical_unit':{'vertex_miles':12,'flat_miles':width,'vertex_km':12*1.609344,'inverse_tolerance_miles':1e-9},'visuals':pngs,'product_runtime_checks_executed':0,'limits':['Validates source/spec/catalog/geometry arithmetic and rendered proposal artifacts only. Does not prove implementation, RNG distribution, actual App integration or UI accessibility.','PNG visually inspected by analyst; no actual app/browser run claimed.']}
(p/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
