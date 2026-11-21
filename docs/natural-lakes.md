# Natural lake rendering

Color mode uses seeded natural basin silhouettes, shallow-to-deep colours and inlet/outlet mouths. Tiles and Emoji modes use whole lake hexes filled with the same deep water colour; they do not mount the natural lake renderer. Water cells, lake IDs, river paths and generation rules do not change. Single-cell lakes use asymmetric curves with bays and headlands; connected lakes use a continuous basin density with broad kernels, large asymmetric shoreline variation and connecting channels and island holes. Shorelines may spill into the neighbouring land margin by up to about 0.30 hex radius, without changing terrain data. Seeded variation operates at several scales. Broad local corrections bound spill without shrinking the entire basin; enclosed land cells get independent shore curves. The persisted map seed, lake ID and coordinates keep the shape reproducible. The biome colour underneath fills the dry margins of lake cells. Tiles mode suppresses biome tile images throughout lake cells.

River, flow and rapids colours are #159DAC and #8BDBDD in all modes. Waterfalls use waterfall-color.svg with the same palette. Nearshore lake water matches the river; the interior reaches the constant #117F8C deep plateau. Shading is a visual depth approximation based on the combined lake and mouth silhouette.

In the one-mile view, inlet/outlet mouth paint uses the one-mile display width
for the segment fullness (10%..50% of a fine hex). The stored lake cells,
accepted shoreline/islands, river centerline and source-six mouth width remain
unchanged; refined rivers are clipped against the exact accepted lake contour.

A bounded per-layer LRU cache retains up to 64 shorelines and 100,000 points, reusing translated shapes while updating river mouths independently. Existing sea, forest, land palette, terrain artwork and POI styling are preserved.

Validation: Node.js 24 `npm run check` covers type checking, 154 regression tests and the production build. Geometry checks cover deterministic curves, connected basins, island holes, river mouths, caching and bounded spill. Additional seeded checks covered 200 single lakes and 90 chain/bend/island cases. Browser smoke checks hex-shaped lakes in Tiles/Emoji, natural contours in Color, stable contours after switching modes, retained water colours, suppressed lake-cell tile images, PNG export, import/save, rotation, islands and deep single-cell water. Release browser results are recorded in CI.


Manual water editing uses the same persisted cells/lake IDs and natural renderer; see [water-editing.md](water-editing.md). E6 prepares water edits before committing, invalidates contour/mouth inputs through the actual geometry, and preserves local land biomes beneath water. It does not change the seeded shoreline style or the existing Color/Tiles/Emoji distinction.

The one-mile small-lake editor checks the seeded shoreline inside its selected
cell mask against existing path centerlines, crossing approaches and protected
point anchors. The map and PNG render the same path and mask. The one-mile view uses the same lake colour and wave engraving as the surrounding one-mile lake tiles. The water blends into the land along one continuous shoreline for the whole group. The wave symbols follow the map orientation in the editor and in the exported PNG. An intersection
identifies the existing feature in the draft and prevents the save. An area POI
can contain a lake when its route and water attachment points stay dry.

An accepted one-mile river can feed and leave a small lake. The accepted shore
and its cell mask also mask the river artwork, so the river meets the shore at
its actual entry and exit and the lake fill shows between them. The surface
area, upstream and downstream river path, direction and ID are preserved.
A bank contact needs no new source or outlet. The six-mile map keeps its
existing river display.

A small lake keeps its selected cells in the document. Its natural shore may
extend into an adjacent cell with full dry support when the visible spill avoids
protected features and existing small-lake masks. The same derived mask is
used in the draft, the accepted map, and PNG. Clipping must leave one connected
body of water. Interior islands are permitted.

Edits and import check each stored small-lake shoreline against the resulting
one-mile geometry even when the six-mile map is open. A conflict identifies
the saved footprint and leaves the open map and both history stacks intact.

Ordinary region generation rolls small lakes on newly supported dry one-mile
cells outside region centers, even from the six-mile view. The owning region's
biome supplies the initial chance (0% sand, 4% swamp and swamp forest, 2%
elsewhere). Original seeds can recruit adjacent new cells once at 10%.
The same world seed and placement produce the same rolls without advancing
the geography and POI streams. A protected feature or an invalid shore rejects only the affected automatic
candidate. Other accepted candidates keep their own shore geometry. Where an existing detail-geometry conflict prevents the one-mile
scene from being prepared, the source region can still be generated while
the unverified small lakes are skipped. Existing local-only lake overlays on
those maps are checked against the source rivers, paths, crossings and points
on import. The automatic layer does not persist generated point geometry.
Fallback tracts make no lake rolls.

Region generation checks existing small lakes against its finished water,
paths and sites before committing. If a previously valid lake conflicts
with that geometry, the same transaction removes the affected lake. Undo
restores both the map and its lakes. Unrelated authored edits retain their
usual loss confirmations.

Manual and automatic lakes keep the permitted fringe cells with their saved
footprint, so accepted water does not expand when neighbouring land is added.
The generator allocates shared fringe to the ordered batch before checking
which candidates conflict with roads, crossings or protected points.
A skipped candidate cannot enlarge the visible shoreline of another.
Older saves without the optional fringe field still open. When expansion
would add dry support beside one of those lakes, the accepted shore is taken
from the map before expansion.
Deleting the last region restores the pre-expansion lakes and ID counter when the
lake layer is unchanged, including after a note on a surviving hex.
Deleting the last region checks the restored paths and sites before committing.
If restoring a checkpoint conflicts with a retained small lake, the editor
removes it together with lakes that lose dry support in that operation.
An incompatible edit to a road or point is rejected before recording history.
The editor keeps the selected hexes outlined when a draft fails validation.

For compatible saves without stored shore cells, deleting a small lake or
editing source water captures each surviving lake's visible fringe before
changing its neighbours. Empty fringes are stored explicitly. Undo restores
the original records, and redo or reloading the edited map preserves the coast.
