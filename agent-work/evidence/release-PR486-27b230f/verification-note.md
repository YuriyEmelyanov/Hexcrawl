# Release verification

Merge27b230f has the accepted full tree. Pages gates/deploy passed. Live default HTML and all entry assets match reviewed-tree build SHA256. Functional probe uses a public synthetic fixture.

Initial Chromium153 connection had certificate-trust failure; negative result preserved. Isolated HTTPS-error-bypass context checked functionality, while ordinary curl TLS and exact hashes supplied independent checks. No product/server TLS settings changed; certificate-error cause not established.

No permanent tests or grades added. Prior registry export denial respected; current release result/score handoff saved separately. Stale latest alone must not cause repeat publication.
