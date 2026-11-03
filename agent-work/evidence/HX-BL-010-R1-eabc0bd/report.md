# HX010-R1 developer correction

Base39359d9; headeabc0bd05ee53d4f249eb7ba3018943cbb88b1cd; tree0013fe61d86ec3774dcbc7b086034002cf349ca5. Exact local staged tree equals GitHub tree. Selected overlay now has SVG ref; applyMapScale synchronizes transform, inverse stroke and shadow in same imperative path as map. No React state/artwork dependency introduced.

Extended existing navigation lifecycle physically compares main polygon and outline on every zoom frame and after pan/rotation. Baseline fails8.36px after first frame; fixed maximum0.0084px, stroke~2CSSpx, artwork unchanged. 900hex diagnostic also measures while has-motion-buffer active: maximum0.0033px, stable stroke, artwork unchanged. These are bounded observations, not an absence-of-all-regressions claim.

Actual before/after desktop1500/narrow390 uses same imported fixture and wheel−400 without unrelated React render. Baseline shift~418.64px; fixed~0.005px. Standalone walkthrough embeds actual browser captures. Physical touch/Safari/Firefox not checked. Full original HX010 matrix from prior review is not claimed as independently rerun here; exact-SHA full required CI recorded separately. PNG export remains in existing navigation lifecycle; source exclusion of overlay unchanged.

Test changes relative39359d9: +0/−0/modified1 existing browser lifecycle; no Node case changed. Temporary900hex and UI probes are diagnostics, not permanent growth. Independent reviewer must recheck new SHA and update score_assessment1.2. No acceptance/score award/main change/publication by this developer run.
