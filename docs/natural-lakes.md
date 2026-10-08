# Natural lake rendering

All three display modes use the same seeded natural lake silhouettes, shallow-to-deep colours and inlet/outlet mouths. Water cells, lake IDs, river paths and generation rules do not change. Single-cell lakes use asymmetric curves within their cell; connected lakes use one smoothed union contour with island holes. The persisted map seed, lake ID and coordinates keep the shape reproducible. Terrain underneath the new shoreline fills the dry margins of lake cells.

River, flow and rapids colours are #159DAC and #8BDBDD in all modes. Waterfalls use waterfall-color.svg with the same palette. Nearshore lake water matches the river; the interior reaches the constant #117F8C deep plateau. Shading is a visual depth approximation based on the combined lake and mouth silhouette.

A bounded per-layer LRU cache retains up to 64 shorelines and 100,000 points, reusing translated shapes while updating river mouths independently. Existing sea, forest, land palette, terrain artwork and POI styling are preserved.

Validation: type check, lake regression tests, all existing regression tests and production build; browser smoke covers equal lake geometry and water colours across modes, PNG export, import/save, rotation, islands and deep single-cell water.
