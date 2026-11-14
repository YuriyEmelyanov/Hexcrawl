import json,re,hashlib
from pathlib import Path
from html.parser import HTMLParser
import jsonschema
P=Path("agent-work/research/market/DND-canon-map-2026-11-14")
d=json.loads(P.with_suffix(".json").read_text())
schema=json.loads(Path("/workspace/scratch/research-contract.json").read_text())
for x in d["observations"]: jsonschema.validate(x,{"$ref":"#/$defs/observation","$defs":schema["$defs"]})
for x in d["operational_requirements"]: jsonschema.validate(x,{"$ref":"#/$defs/operational_requirement","$defs":schema["$defs"]})
class Body(HTMLParser):
 def __init__(self):super().__init__();self.on=False;self.depth=0;self.data=[]
 def handle_starttag(self,t,a):
  if t=="div":
   if not self.on and "post-body" in dict(a).get("class",""):self.on=True;self.depth=1
   elif self.on:self.depth+=1
 def handle_endtag(self,t):
  if t=="div" and self.on:
   self.depth-=1
   if self.depth==0:self.on=False
 def handle_data(self,s):
  if self.on:self.data.append(s)
p=Body();raw=Path("/workspace/scratch/myrealms-key.html").read_text();p.feed(raw);text=" ".join(p.data)
coords=re.findall(r"(?<![0-9])(\d{2}\.\d{2})(?![0-9])",text)
# First occurrence follows a heading; Phandalin's two additional occupied cells are not sites.
expected=[x["coordinate"] for x in d["source_key_ledger"]]
unique=list(dict.fromkeys(coords))
source_sites=[x for x in unique if x not in ["01.02","02.01"]]
checks=[]
def ck(id,ok,detail):
 assert ok,(id,detail)
 checks.append({"id":id,"result":"pass","detail":detail})
ck("schema-observations",len(d["observations"])==2,"Both observations validate data-contract")
ck("schema-operational-requirements",len(d["operational_requirements"])==2,"Two generic L1 criteria validate data-contract")
ck("complete-key",source_sites==expected,"HTML independently yields14ordered site coordinates;2other references are same-settlement cells")
ck("visual-map",all(x["map_icon_visually_matched"] for x in d["source_key_ledger"]),"Manual whole-raster inspection matched every key anchor; no raster interpretation simulated by parser")
ck("play-vs-plan",all(x["visit_evidence"]=="not_established" for x in d["source_key_ledger"]),"No prepared site promoted to a visited session")
ck("one-settlement",d["map_scope"]["settlement_count"]==1 and len(d["map_scope"]["settlement_occupied_source_cells"])==3,"Three occupied cells are not3settlements or physical size proof")
ck("one-project",d["deduplication"]["source_posts"]==2 and d["deduplication"]["project_records"]==1,"Same author/campaign across two posts")
ck("no-population",all(d["source_vs_product"][k] is None for k in ["current_2026_use","people_count","p_create","unmet_demand"]),"No people/prevalence/switching-demand estimate")
ck("source-scale",d["map_scope"]["author_reported_hex_length_miles"]==0.5 and d["map_scope"]["geometric_convention"] is None,"Half-mile author parameter retained; geometric convention not inferred")
ck("synthetic-scale",2*0.5==1,"Arithmetic acceptance fixture only, not runtime or source geometric verification")
ck("no-activation",not any(d[k] for k in ["active_rating_changed","active_numeric_method_changed","product_queue_changed","new_product_tasks"]),"No active or queue change")
ck("no-new-rule",d["canonical_reuse"]["new_rules"]==d["canonical_reuse"]["new_bindings"]==0,"Generic operation refs only; campaign source notregistered as official rule")
ck("no-runtime-proof",d["canonical_reuse"]["product_evidence"]["runtime"]=="unknown_not_executed","Current teamSHA is contextual; no implementationclaim")
meta=json.loads(Path("/workspace/scratch/myrealms-map-metadata.json").read_text())
meta.update({"key_html_sha256":hashlib.sha256(raw.encode()).hexdigest(),"intro_html_sha256":hashlib.sha256(Path("/workspace/scratch/myrealms-post.html").read_bytes()).hexdigest(),"site_coordinates":source_sites,"additional_same_settlement_coordinates":["01.02","02.01"],"inspection":"Full raster seen using view_image; HTML parsed independently; no external map copied into repository."})
Path(str(P)+"-source-check.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n")
Path(str(P)+"-checks.json").write_text(json.dumps({"status":"pass","checks_passed":len(checks),"checks":checks,"limitations":"Schema/source QA plus arithmetic fixtures; not product/browser/runtime acceptance."},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"passed":len(checks),"source_sites":source_sites,"map_sha256":meta["sha256"]}))

