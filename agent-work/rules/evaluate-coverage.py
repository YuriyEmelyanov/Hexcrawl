#!/usr/bin/env python3
"""Derive shared-rule coverage. Does not award scores or edit the registry.
Usage: python3 evaluate-coverage.py INPUT.json OUTPUT.json
INPUT keys: rules (canonical array), bindings (source array), evidence (array), release_sha.
Evidence keys: id,rule_id,release_sha,review_status=verified,status=full|partial|absent,
profile={parameters,exceptions,conditions}, method, evidence_ref.
A source profile requires profile_status=verified. Unknown is never absence.
"""
import json, sys
def signature(p):
    return json.dumps({k:p[k] for k in ("parameters","exceptions","conditions")},sort_keys=True,separators=(",",":"))
def evaluate(d):
    ids={r["id"] for r in d["rules"]}
    if len(ids)!=len(d["rules"]): raise ValueError("Duplicate canonical ID")
    sha=d.get("release_sha")
    out=[]
    for b in d["bindings"]:
        parts=[]
        for p in b["profiles"]:
            rid=p["rule_id"]
            if rid not in ids: raise ValueError("Missing canonical ID: "+rid)
            matches=[]
            if sha and p.get("profile_status")=="verified":
                for e in d.get("evidence",[]):
                    if e.get("rule_id")==rid and e.get("release_sha")==sha and e.get("review_status")=="verified" and e.get("method") and e.get("evidence_ref") and signature(e["profile"])==signature(p):
                        matches.append(e)
            statuses={e.get("status") for e in matches}
            # Contradicting evidence must be resolved explicitly, never prefer a green result.
            status=next(iter(statuses)) if len(statuses)==1 and statuses<= {"full","partial","absent"} else "unverified"
            parts.append({"rule_id":rid,"status":status,"evidence_ids":[e["id"] for e in matches]})
        states=[p["status"] for p in parts]
        status="full" if states and all(s=="full" for s in states) else "partial" if any(s in ("full","partial") for s in states) else "absent" if states and all(s=="absent" for s in states) else "unverified"
        out.append({"binding_id":b["id"],"game_id":b["game_id"],"status":status,"components":parts})
    return {"release_sha":sha,"bindings":out,"score_awarded":False}
if __name__=="__main__":
    with open(sys.argv[1],encoding="utf8") as h: d=json.load(h)
    result=evaluate(d)
    with open(sys.argv[2],"w",encoding="utf8") as h: json.dump(result,h,ensure_ascii=False,indent=2)
