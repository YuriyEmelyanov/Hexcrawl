# Map navigation

Wheel zoom and two-finger pinch scale the existing SVG using a composited CSS transform. SVG dimensions stay fixed in map coordinates. A separate map stage supplies the scaled scrolling bounds. Mouse drag and zoom updates are coalesced to at most one update per animation frame. Single-finger scrolling remains native; wheel and pinch cancellation use non-passive native listeners.

Navigation does not update React application state or rebuild forest, water, POI or terrain artwork. The wheel focal point uses the actual SVG bounds, including the centered position of small maps. Scale is clamped as before; wheel delta units are normalized. Import restores the live scale; JSON reads the latest scale, including queued input. PNG export clears navigation transforms and exports the complete original map at its original coordinates. Rotation continues to use the original artwork transform.

`test/browser/navigation.smoke.mjs` loads a 400-hex forest, exercises actual wheel and mouse handlers, and checks unchanged SVG contents/dimensions, batching, focal point, panning, rotation, JSON and PNG export. It reports animation-frame and handler timings. With `NAV_BASELINE=dist-baseline` it compares the same interactions to the production version before this change. Frame timings are runner-specific and do not establish a device-independent frame rate.
