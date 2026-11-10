import json, subprocess, hashlib, pathlib, datetime
R=pathlib.Path('/workspace/scratch/50f278832674')
O=R/'finish496-river-review/review-205649d'
C=R/'finish496-code'
OPS=R/'finish496-ops'
HEAD='f677629c4c1c3a84656ad88a6e118c56da3c7eb3'
TREE='b0f479b31cec65bfe240da06ed60743c8327a25d'
PRIOR='9aa4bc627a051d3a7d4570303be10b227d6bed40'
BASE='1962fb9a835a9c310e55c1a09415fe180f22cca9'
def git(*a):return subprocess.check_output(['git',*a],cwd=C,text=True).strip()
def read(p):return json.loads(p.read_text())
def write(n,x):(O/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
patch=git('diff',PRIOR,'HEAD','--','src/App.tsx')
changed=git('diff','--name-status',PRIOR,'HEAD').splitlines()
srcpaths=git('ls-tree','-r','--name-only',PRIOR,'src').splitlines()
unchanged=[]
for p in srcpaths:
    a=git('rev-parse',f'{PRIOR}:{p}');b=git('rev-parse',f'HEAD:{p}')
    if a==b:unchanged.append({'path':p,'git_blob_sha':a})
source={'head_sha':HEAD,'tree_sha':TREE,'prior_accepted_sha':PRIOR,'published_base_sha':BASE,
 'local_head_sha':git('rev-parse','HEAD'),'local_tree_sha':git('rev-parse','HEAD^{tree}'),
 'tree_matches_reviewed_remote':git('rev-parse','HEAD^{tree}')==TREE,
 'changed_paths_since_prior':changed,'unchanged_src_files':unchanged,
 'app_patch_sha256':hashlib.sha256((patch+'\n').encode()).hexdigest(),
 'app_diff_scope':'Only new generatedRiverNetworkIsValid helper and two precommit guard callsites; no UI/DETAIL1/CLASSIFY1 rendering, model, controller or importer edits.',
 'test_diff_scope':'Only test/riverIntegration.test.mjs existing named callback expanded with original saved CI before input; new data fixture, no new named Node case.',
 'browser_suite_unchanged':not git('diff',PRIOR,'HEAD','--','test/browser'),
 'carry_forward_rule':'Prior finite DETAIL1/CLASSIFY1 acceptance transfers only for unchanged source paths/contracts; fresh river and release-presentation evidence complements it. This is not a new full audit.'}
write('source-correspondence.json',source)
walk=read(R/'finish496-ui/walkthrough.json')
sha=hashlib.sha256((R/'finish496-ui/artifact.zip').read_bytes()).hexdigest()
ui={'head_sha':HEAD,'checkout_merge_sha':'0c58d3d84ef5d17fece0869dd1e0f998403ca804','tree_sha':TREE,
 'run_id':42906586915,'job_id':130146210771,'artifact_id':13804069164,
 'api_digest':'sha256:a051707db1396884f7bfe5f1df21019ae165826d0fb91c5c47283b4c1ff9cadc',
 'computed_archive_sha256':sha,'digest_matches':sha=='a051707db1396884f7bfe5f1df21019ae165826d0fb91c5c47283b4c1ff9cadc',
 'provenance':'Independent GitHub artifact API confirms artifact belongs to exact head f677 and run42906586915. Root independently established synthetic merge tree equals head tree; local candidate tree also equals exact head tree.',
 'walkthrough':walk,'visually_inspected_files':sorted(p.name for p in (R/'finish496-ui').glob('*.png')),
 'observations':['Same source geography, capital/village icons and names in main-before and candidate-before at1500/390. Candidate normal card adds dangerous terrain and on-passage discovery; redundant Surface row absent in normal view and available in editing.',
 'Editing controls are explicit; proposed footprint preview says map not yet changed, actual apply state says saved. 1/6/12/24 controls change representation; unique object ownership is retained, 12-mile cell lists two distinct owners, long names wrap.',
 '320px layout wraps grid controls into2x2 without horizontal text overflow. 390px uses3+1. PNG12/24 retain geometry, footprints and counts; selected-cell interaction overlays differ from export as expected.'],
 'limitations':['Small authored fixture, Chromium emulation, no physical-device/cross-browser/accessibility completeness claim; no random generation study.',
 'Some desktop6/24 and other viewport-transition screenshots capture the existing side-panel toggle during its CSS left/top .28s transition; it transiently overlays scale6 in those frames. UI source is unchanged; this is an evidence timing limitation, not proof of a new persistent defect. Use stable before/12mile/320 views for owner presentation. No screenshot assertions were relaxed.',
 'CI artifact reviewed; child did not run a local browser. Actual owner presentation is root responsibility.'],
 'temporary_release_diagnostic':True,'permanent_cases_added':0}
write('ui-evidence-review.json',ui)
test={'base_sha':PRIOR,'head_sha':HEAD,'comparison_scope':'Changes since prior accepted9aa only, not cumulative PR-vs-main totals',
 'added':0,'removed':0,'modified':1,'suite':'Node node:test',
 'scenario_risk':'Existing RIV-EX-01/12/13/15 expansion callback now includes original CI lake-contracted CYCLE input. Accept full valid network OR exact rollback of document and Undo/Redo; previously Classic accepted invalid full network.',
 'reuse_or_new_reason':'Extends existing real-expansion requirement instead of adding a duplicate named case or random series; original saved snapshot covers a demonstrated missing lake-contraction path.',
 'count_source':'git diff9aa..local same-tree f677, unchanged named Node test declarations; fixture data is not a test case.',
 'runner_case_count':386,'browser':{'added':0,'removed':0,'modified':0,'permanent_case_count':9},
 'temporary_reviewer_diagnostics':['original recorded input main/head actual-handler replay','fixed forced-full-network rejection exercising bounded regular/fallback and exact rollback','existing legacy-map continuation plus detached new SCC and LAKE_AREA policy checks'],
 'temporary_release_diagnostic':'PR496-only presentation script/job,20PNG; not permanent Node or browser suite growth, not summed with either runner.',
 'execution_counts':'Focused replay outcomes recorded in separate JSON. Final complete CI check/browser status in CI-jobs.json remains separate; no pass total inferred from names.'}
write('test-change-summary.json',test)
rv=read(O/'river-diagnostic.json')
report={'schema_version':1,'role':'independent_reviewer','task_id':'HX-BL-051','related_task_ids':['HX-BL-044'],'pr':496,
 'head_sha':HEAD,'tree_sha':TREE,'published_base_sha':BASE,'prior_accepted_sha':PRIOR,'reviewer_authored_implementation':False,
 'review_type':'Bounded independent delta and release preparation review; no new full product audit, no random series, no source mutation.',
 'verdict':'technical_delta_accepted_required_final_CI_pending','release_approved':False,
 'remaining_gate':'Root must independently observe final exact-head required check/browser success and persist outcome; owner separately authorizes publication of this exact package. No merge authorized by this report.',
 'RIV016':{'status':'known_saved_CYCLE_fixed_on_exact_head','original_seed':1702308986,'action':'Classic locality at2,-2',
 'main_replay':{'regions':rv['main']['replay']['regions'],'error':rv['main']['replay']['error'],'full_validation':rv['main']['replay']['checked']},
 'candidate_replay':{'regions':rv['head']['replay']['regions'],'error':rv['head']['replay']['error'],'full_validation':rv['head']['replay']['checked']},
 'adapter_original_networks_equal':rv['same_networks'],
 'reason':'Both regular/fallback now validate whole numerical network after lake contraction. Only admissible candidate commits; original accepted map is not edited to mask a problem.',
 'same_input_limit':'Published main receives v10 without unsupported physicalGrid; geographical data and saved RNG streams unchanged. Candidate imports exact original v11 bytes.'},
 'admission_and_legacy':{'both_guard_sites_reviewed':True,'before_context':'Original immutable snapshot, not trial sea-recovery context.',
 'mode':'Mythic remains strict. Classic allows only exact unchanged old numeric/build interactions using existing editor policy.',
 'rollback_evidence':read(O/'guard-rollback.json'),'legacy_evidence':read(O/'legacy-policy-head.json'),
 'source_reasoning':'Complete before/after physical networks are separately constructed. numericViolations signatures include actual node kind/area, incident edges/fullness/owners/heights/ports. directedRiverCycles compares cyclic SCC internal-edge signatures; a global oldCYCLE flag cannot authorize a second SCC. New/changed LAKE_AREA and cycle refused in detached independent policy probes.',
 'unexpected_errors':'Only RIV-coded or current adapter build issue exceptions become normal refusal; unexpected programming exceptions rethrow to existing atomic rollback. No blanket success or blanket catch.',
 'bounded_cost':'One complete after build per candidate; complete before build only on invalid Classic candidate. Existing attempt counts unchanged. No new random series or solver.',
 'limitation':'Existing physically invalid legacy interactions can remain invalid exactly as before. This is compatibility preservation, not repair or a statement that every accepted old map is fully valid.'},
 'RIV011':{'historical_original_cause':'unknown','original_input_available':False,'original_reproduced_or_fixed':False,
 'release_disposition':'controlled_original_cause_unknown','owner_risk_waiver_required_for_this_technical_disposition':False,
 'basis':['Owner-authorized bounded fixture/source comparison performed; prior fixture demonstrates actual missing lake sink yields RIV011 on main/head, not proof of historical cause.',
 'New exact-SHA complete-network gate covers RIV011/RIV016 class in both actual commit paths; new LAKE_AREA cannot borrow unchanged old CYCLE, and original accepted contexts are compared separately.',
 'Known concrete CYCLE input now commits a valid alternative and forced new invalidity yields exact bounded rollback; existing legacy continuation preserved.'],
 'release_blocker':'No remaining independently confirmed blocker in this bounded delta; final exact-SHA required CI and owner publication decision remain separate gates.',
 'limitation':'Historical72.746,-14 input/seed absent; no claim of historical reproduction, root cause or universal hydrology correctness. A distinct undiscovered failure remains possible, not invented.'},
 'test_governance':test,'source_correspondence':'source-correspondence.json','ui_review':'ui-evidence-review.json',
 'prior_scope_evidence':'agent-work/evidence/review-HX-BL-051-9aa4bc6/; applies to unchanged DETAIL1/CLASSIFY1 paths only.',
 'score_assessment':'score-assessment1.2.json','score_points_awarded':0,
 'limitations':['Final CI check/browser pending at handoff; never call pending a pass.',
 'Actual-handler river checks use existing React harness, not a fresh production DOM; release-presentation production Chromium artifact was independently provenance-checked and visually inspected.',
 'Finite deterministic fixtures/policy probes do not establish10 000-map target or any whole criterion grade.',
 'Earlier simple allmode strict guard had2 legitimate legacy failures; superseded helper explicitly preserves exact old interactions. That interrupted run is not a complete passed check.'],
 'automation_health':'automation-health.json','completed_at':now}
write('independent-review.json',report)
score=read(OPS/'agent-work/evidence/review-HX-BL-051-9aa4bc6/score-assessment1.2.json')
score.update({'head_sha':HEAD,'tree_sha':TREE,'prior_accepted_sha':PRIOR,'review_date':now,
 'operations_snapshot':git('-C',str(OPS),'rev-parse','HEAD'),
 'functional_verdict':'bounded_delta_accepted_final_required_CI_pending',
 'release_conditions':['Final exact-head required check/browser success, persisted by root.','Owner separately authorizes exact package publication.'],
 'review_scope':'Nine prior affected criteria updated by independently verified source correspondence and fresh exact-head river/UI evidence. Finite prior evidence is preserved explicitly, not called a new full audit.'})
for criterion in score['criteria']:
    criterion['reviewed_sha']=HEAD
    criterion['prior_quality_evidence']=criterion['quality']
    criterion['quality']={'status':'prior_bounded_quality_preserved_new_river_admission_verified','evidence':'No rendering/controller/importer changes since accepted9aa; source-correspondence.json. Fresh exact-head same-input UI and numerical-river guard evidence reviewed; final required check/browser CI pending.'}
    criterion['method']='Independent delta source inspection, complete snapshot main/head replay, bounded forced refusal/rollback and legacy policy probes, exact-head CI artifact API digest and20PNG visual inspection. Prior detailed functional evidence remains explicitly inherited through unchanged source.'
    criterion['prior_evidence']=['agent-work/evidence/review-HX-BL-051-9aa4bc6/'+f for f in criterion['evidence']]
    criterion['evidence']=['source-correspondence.json','independent-review.json','river-diagnostic.json','guard-rollback.json','legacy-policy-head.json','ui-evidence-review.json','CI-jobs.json']
    criterion['limitations']+=['Required final check/browser CI still pending at this bounded handoff; finite evidence does not justify any whole-grade transition.','Prior functional evidence is transferred only where source unchanged, not freshly rerun in full.']
score['supplemental_affected_criteria']=[{'criterion_id':'S01-C02','title':'Гидрология и геометрия русел','weight':40,'reviewed_sha':HEAD,
 'before':{'grade':None,'points':None,'status':'unverified','source':'agent-work/score/current-score.json','blob_sha':score['current_score_blob_sha']},
 'after':{'grade':None,'points':None,'status':'insufficient_evidence_for_whole_grade'},'delta':None,'awarded_points':0,
 'quality':{'status':'bounded_known_cycle_fixed_new_admission_verified_legacy_preserved','evidence':['river-diagnostic.json','guard-rollback.json','legacy-policy-head.json','source-correspondence.json']},
 'breadth':{'status':'unverified','top5':'unverified','top10':'unverified','top20':'unverified','application':'No artificial game breadth assigned to technical invariants.'},
 'method':'Exact saved originalbefore actual-import/continuation versus main, forced candidate refusal in both paths, existing legacy map continuation, new SCC/LAKE_AREA detached policy controls.',
 'limitations':['No10 000 generation target verification or new random series. Historical RIV011 original cause unknown. Exact unchanged legacy invalidity remains possible by existing compatibility contract. Final required CI pending.']}]
score['summary_status']='insufficient_evidence_for_all_whole_grades_nine_prior_plus_supplemental_hydrology'
current=read(OPS/'agent-work/score/current-score.json')
assert len(current['criteria'])==50 and sum(x['weight'] for x in current['criteria'])==1000
assert all(x['grade'] is None and x['points'] is None for x in current['criteria'])
assert all(x['before']['grade'] is None and x['after']['grade'] is None and x['delta'] is None for x in score['criteria']+score['supplemental_affected_criteria'])
score['invariants']['checked_current_50_count_and_weight']=True
write('score-assessment1.2.json',score)
print(json.dumps({'output':str(O),'files':[p.name for p in O.glob('*.json')],'source_unchanged_files':len(unchanged),'score_criteria':len(score['criteria']),'supplemental_criteria':len(score['supplemental_affected_criteria'])}))
