# GEO2 source/mark correspondence checkpoint

Unmounted HX-BL-051/ONE-MILE1/GEO2 source adapter. Exact code SHA and tree are in
source-provenance.json. This evidence does not accept G201–G210 or authorize release.

`witness.mjs` uses the existing road-entry-zigzags fixture, without generating a
new map. Run on Node24 from the exact code checkout:

    GEO2_CHECKOUT=/path/to/exact-checkout node /path/to/witness.mjs

Outputs witness.json and river-source-plan.json beside the script. The full plan
is reproducible and is not duplicated here. Empty resolved mark sets are explicit
for this retained-world direction diagnostic: they do not assert an absence of
actual automatic marks. Mark relocation/direction is independently checked by the
named synthetic permanent Node case (focused.log). No screenshot/UI result.

Tests: two new Node logical cases for contradictory/stale source refs and directed
mark positions. The existing53-segment case is expanded to pass through real source
sector normalization and assert sector boundary provenance. Browser/RNG suites are
separate and remain pending for the complete activated package.

Boundary references are preserved but actual boundary-port and interior-terminal
constraints still need implementation. All dependent POI, road/crossing, finite
water-envelope, shoreline, public16/history and UI work remains within GEO2.
