# Electrical Planner MVP (Web CAD-lite)

Web-based electrical planning editor for quick top-view floor plans in real-world meters.

## MVP Features
- Konva CAD-lite editor with left tools panel, center canvas, right properties panel.
- Wall centerline drawing with generated wall polygons.
- Rectangular room tool + room model foundation.
- Obstacle/no-go polygon drawing.
- Snapping (grid/vertex/edge/midpoint), measure tool, selection/editing.
- Undo/redo, autosave + recovery, unsaved changes warning.
- XML import/export (meters-based), SVG/PNG export.
- Disabled Compute placeholder for Phase 2/3 optimization.

## Screenshot
- _Add screenshot here after first run_

## Quick Start
```bash
npm install
npm run dev
```

## Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| V | Select tool |
| W | Wall tool |
| R | Rect Room tool |
| O | Obstacle tool |
| D | Door tool |
| N | Window tool |
| Delete | Delete selection |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Save XML |
| Ctrl+O | Open XML |
| Esc | Cancel current action |

## Export / Import
- Save XML from TopBar “Save XML”.
- Open XML via file picker in “Open XML”.
- Export SVG/PNG from TopBar buttons.
- Per-room export utilities exist in `src/io/perRoomExport.ts`.

## Development
See `docs/COMMANDS.md`, `docs/DATA_MODEL.md`, `docs/GEOMETRY.md`, and `docs/ROADMAP.md`.


## Tool Usage (Phase 2)
- **Select (V):** click to select walls/rooms/obstacles/openings; drag selected entity to move it.
- **Wall (W):** click start point, move cursor, click end point; `Esc` cancels active wall preview.
- **Rect Room (R):** click-drag to place a snapped room rectangle (defaults: `name=Room`, `classification=internal`).
- **Obstacle (O):** click-drag to place a snapped rectangular obstacle.
- **Door (D):** with wall selected or by clicking wall, place a door opening (default width `0.9m`).
- **Window (N):** with wall selected or by clicking wall, place a window opening (default width `1.2m`).
