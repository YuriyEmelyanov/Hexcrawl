# HX-BL-051 GEO2 scoped road/part removal

Source 14e1d740649dbf86e523f528dee693276637b40a; base 0832eedfc65895197e2cc098d5b694a3d9f4acc7. Approved GEO2-v2 scope; programmer component only, not full acceptance.

Ordinary road editor first enforces existing exits/connectivity/dead-end/minimum/name/river-feature rules. Only then it supplies exact old road-part keys selected by the remove command. Scope projection allows an actually absent whole road only if every old part was selected; absent crossings only for actually absent selected parts (or explicitly absent removed rivers). Strict import receives no intent. Full GeometryPlan and global boundary validation still precede history writes. River removal retains context through both existing preparation passes.

Concrete separate risk: a surviving road ID must not cause a selected crossing part to remain required, nor allow other missing parts/references to disappear. Reused accepted/scoped setup extracted from existing G208 source-edit lifecycle; one distinct Node case covers whole/part removal with alternate connected network, exact old unrelated paths, counters/RNG, global POI/local edits, one UndoRedo and exact16 reload. Existing G208 case adjusted to shared setup/context type. No seed sweep or duplicate browser test added.

The first small open-exit fixture was correctly rejected by ROAD; it was not treated as a product defect. Final fixture uses interior removed road with an alternate loop and extends its real river mouth to the enlarged land boundary. No rule or source-generation algorithm was loosened for tests. repro.log uses final fixture on the exact base source and fails at actual whole-road edit; focused.log passes the final source including previous river and failed-closure/required-POI cases.

Limits: finite backend examples, no nonempty mixed boundary continuation/relocation, broader source migration, actual initial UI/overlays/map/PNG, full G201–G210 or independent review yet. Full check is running on exact SHA; browser attempts follow build. No current-score/history update, release or PR503 update.
