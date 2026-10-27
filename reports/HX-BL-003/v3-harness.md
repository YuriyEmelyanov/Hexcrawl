# V3 harness handoff

Implements the approved P1-V3/1.0 (operational spec copied byte-for-byte into v3-protocol.md/json). Product src/public/package/lock remain those of candidate739e3de; A baseline103d31b is built separately. No PR475 UI in measured builds. No measured or history action is part of syntax/offline preparation.

The existing Check workflow now checks the PR head explicitly in its three existing jobs. After PR475 changed main, a synthetic merge tree is no longer the exact unmerged performance candidate; this avoids treating combined-main CI as exact-head evidence. Commands and test cases are unchanged.

New V3 files: runner, pure typed-codec/statistics helpers, a history-only read accessor insertion, freeze script, protocol copies, manifest and a one-use execution workflow. Existing BrowserSupervisor implementation and its four disposable-child tests are reused unchanged. A serialized adapter shares a total five-second cleanup deadline across the supervisor's existing phases and global/final cleanup calls. Offline diagnostics cover typed Map/Set/undefined, nonpassing/incomplete analysis and the exact accessor insertion in A/B without executing the app. They are temporary diagnostics, not new permanent test cases. No new permanent tests are justified by this bounded measurement package; reviewers should assess the actual risks, not a target test count.

## Before the sole execution

1. Verify this exact commit and manifest, normal Check CI, source parity and observation-only history patch independently. No browser run is needed for offline review.
2. Record in the existing backlog HX-BL-003.v3_handoff.offline_review: status="accepted", head_sha=<exact source SHA>, result_ref=<independent evidence>. The execution job reads this and checks successful exact-head Check CI. An unaccepted/mismatched head fails before any action.
3. The programmer creates **one previously nonexistent branch agent/hx-bl-003-v3-approved at that exact SHA**. The create event runs the measured job only for that fixed branch. It does not require an additional source commit, workflow activation edit, publishing to main or another owner decision. Do not create it while preparing/reviewing the harness. Never delete/recreate it after failure. There is no automatic trigger on PR edits and no retry. Existing connector create_branch is sufficient; no missing dispatch capability should cause another preparation loop.
4. Run_attempt must be1; the workflow also checks the total create-event executions for its workflow ID on that execution branch across SHAs. A second execution fails the preflight gate. One job45min includes setup; runner soft deadline43min, remaining rows explicit not_executed.

GitHub's create event uses the commit on the created branch: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#create . The execution branch, unlike the permanent team automation, is a one-use source ref, not another scheduled automation.

The environment, input/harness manifests and history-only patches are uploaded as an immutable preflight artifact before any actions. The final artifact includes raw/statistics, all typed gzip snapshots, JSON files, source maps, trace files and recursive file hashes. The main measured checkout does not change SHA to record its environment. Decode-completion/snapshot phases not directly observed are explicitly limited; traces do not establish causal effects merely by order. Primary uses all240frames/phase at rank228; traces and position statistics stay separate.

Next: independent offline acceptance, then the already approved single V3 execution. Product acceptance, score grades and publication remain independent later decisions. No PNG exports or generation timing benchmark.
