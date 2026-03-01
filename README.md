# Floorplan Drawer — Pro CAD Edition (Local JS, /css, /assets)

Changes in this package:
- **/js** folder contains `app.js` and (your) `svg.min.js`
- **/css** folder contains `styles.css`
- **/assets** folder ships with a `sample_floorplan.xml` (placeholder)
- **File → Import XML…** added (same as Open), plus **drag & drop** XML onto the canvas
- **Ctrl+Click selection in any tool** (quick-select without switching tools)

**Reminder:** Replace `js/svg.min.js` with your local SVG.js v3.x build.

All previous features remain:
- Zoom/pan (wheel zoom around cursor; Space/MMB to pan)
- Apply/Reset in the right panel
- Auto-close rooms (walls kept) & shared walls meta (rooms_left/right)
- Edge/midpoint + grid snapping; Shift for angle snap
- Measure tool (📏)
- Meters-based XML import/export
- Undo/Redo, Autosave, View persistence
