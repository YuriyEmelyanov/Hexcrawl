# E5 persistence checkpoint35dc28a

Implemented v7 document state, atomic import, monotonic generated river allocation, real feature eligibility/rendering and complete history/rollback fields. Existing regenerate rollback test caught and verified a missing setter path.

This is an intermediate draft PR486, not the completed river editor. Physical RIV geometry/constraints, edit commands/dependencies, compact UI and actual walkthrough remain. No release or score award. Checks and limits are recorded in checks.json; initial red runs are retained.
