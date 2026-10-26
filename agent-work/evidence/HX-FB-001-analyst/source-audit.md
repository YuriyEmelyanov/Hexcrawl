# HX-FB-001 — source audit26.10.2026

Baseline103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b checked via main ref. Appblob48c6af2585d592328e393153bf437eeadc7c9524, CSSblobe28226d9fbbb928ab557cd10f3800bb59c9edb8f. No productbrowserinspection claimed. Ownerreportedvisualconcern; DOMplacementandabsenceofseedscopedCSS verifiedfromsource. Mock is schematic.

## Input and notice
```tsx
            <div className="control-block"><label>{language === 'ru' ? 'Seed мира' : 'World seed'}
              <input aria-label={language === 'ru' ? 'Seed мира' : 'World seed'} inputMode="numeric" value={seedInput}
                readOnly={!!regions.length || !!hexTerrainByKey.size || !!kingdoms.length}
                disabled={mutationBlocked()} onChange={e=>{setSeedInput(e.target.value);setSeedError(false);}} onBlur={applyWorldSeed} />
            </label>{seedError ? <p role="alert">{language === 'ru' ? 'Seed: целое число от 0 до 4294967295.' : 'Seed: integer from 0 to 4294967295.'}</p> : null}</div>
            {legacyNotice ? <p role="status">{language === 'ru' ? 'Старая карта: seed задан для дальнейшего продолжения' : 'Legacy map: seed assigned for future continuation'}</p> : null}
            <div className="control-block mode-selector"><label>{language === 'ru' ? 'Режим' : 'Mode'}
```
## Transfer location
```tsx
            <div className="control-block controls controls--transfer">
              <details className="export-menu">
                  <summary className="secondary">{t.export}</summary>
                  <div className="export-menu__items">
                    <button type="button" disabled={!renderDetails} onClick={() => void handleExportPng()} className="secondary">PNG</button>
                    <button type="button" onClick={handleExportJson} className="secondary">JSON</button>
                  </div>
                </details>
              <button type="button" disabled={isImporting || !!pendingRegen || !!kingdomJob} onClick={handleImportJsonClick} className="secondary">{t.importJson}</button>
              <input ref={jsonImportInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void handleImportJson(event)} />
            </div>
            {generationError && (
```
## Existing validation
```tsx
  const applyWorldSeed = () => {
    if (mutationBlocked()) return false;
    if (regions.length || hexTerrainByKey.size || kingdoms.length) return true;
    const seed = /^\d+$/.test(seedInput) ? Number(seedInput) : NaN;
    if (!isUint32(seed)) { setSeedError(true); return false; }
    setSeedError(false);
    if (seed === generationRef.current.masterSeed) return true;
    const before = captureDocument();
    const map = {...before.map, generation: createGenerationState(seed), toponymSeed: toponymSeedFor(seed)};
    recordTransaction(before, {...before, map}); applyExactMap(map);
    return true;
  };
  const generateAt = (anchor: AxialHex) => {
    if (mutationBlocked() || !applyWorldSeed()) return;
```
## Related theme
```css
.gen-params select { width:100%; min-width:0; background:#0c1423; color:#eef4ff; border:1px solid #375386; border-radius:8px; padding:.4rem .5rem; font-size:.85rem; cursor:pointer; }
```
Sourcefilesreadonly; no UI/RNG modifications. Screenshotbeforeimplementation stillrequiredfromdeveloper, mockdoesnotclaimruntimeproof.
