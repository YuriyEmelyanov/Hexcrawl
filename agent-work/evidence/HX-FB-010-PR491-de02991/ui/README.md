# PR491 actual UI

Exact head `de0299168e5a74d4e3594db71d657ca8055614e0`, tree `79b69059c70eed7430bcda93db5d72a6097695d3`. Before: published PR490 / `e99cb1236e152e8e6a5987af95e19d601dbc3a78`.

Desktop: [before](before-ru-1500-central.png) / [after](after-ru-1500-central.png). Narrow: [before](before-ru-390-central.png) / [after](after-ru-390-central.png). [English desktop](after-en-1500-central.png), [English narrow](after-en-390-central.png), [name edit](after-en-390-name.png), [type edit](after-en-390-type.png).

The central explanation and its separator disappear; type/name remain. Fresh App contexts start English; RU toggle is retained. Actual desktop before/after was presented in the existing user chat during this run. No new language preference persistence.

Screenshots/runtime were produced from App blob `7c533a25bf02b64bf7dfee8f394e2c0c6878576a`. Final tree only changes three fixture/diagnostic locale setup sites after that smoke, independently reviewed. Original diagnostic metadata is preserved rather than relabelled as a fresh execution.

Limitations: headless Chromium, 1500/390px emulation; no physical touch or screen reader verification. Some emoji are missing in the screenshot font; icons unchanged. PR491 has no publication permission yet.
