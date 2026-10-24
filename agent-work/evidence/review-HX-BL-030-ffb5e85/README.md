# Reproduction

Evidence from independent review of PR472 at ffb5e85311420b14fe509819ec26b420606ce0dd. These files are preserved unchanged except result JSON evidence paths.

To rerun negative regressions, place hx-review-repro.mjs in a scratch folder containing a clone named hexcrawl checked out at the exact reviewed SHA, install dependencies with Node24, then run `node hx-review-repro.mjs`. Its assertions confirm the existing defects; they are not the desired behavior of the correction. The script writes hx-review-repro-output.json next to itself.

Full CI logs are preserved here; upstream run: https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40117916104 .
