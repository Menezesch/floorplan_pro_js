# Electrical Planner MVP (Web CAD-lite)

Web-based electrical planning editor for quick top-view floor plans in real-world meters.

## MVP Features
- Clean three-pane layout: tools, SVG drawing viewport, technical inspector.
- Global project settings panel (wall thickness, ceiling height, 5 cm grid, snap threshold, plan origin).
- Robust coordinates: world coordinates + plan coordinates shown live in status bar.
- Reliable wall segments with thickness rendering, grid/vertex magnetic snapping, and preview.
- Room rectangle tool + auto conversion from 4 axis-aligned closed wall segments.
- Obstacle rectangle tool (model ready for polygons), plus windows/doors opening markers on selected walls.
- XML import/export with `<settings>`, walls, rectangle rooms, obstacles, and openings.
- SVG/PNG exports and unsaved-changes warning.

## Quick Start
```bash
npm install
npm run dev
```

## Tools
- Select (`V`)
- Wall (`W`)
- Obstacle (`O`)
- Room (`R`)
- Windows (`N`)
- Doors (`D`)

## Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| V/W/O/R/N/D | Tool switch |
| Delete | Delete selection |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Save XML |
| Ctrl+O | Open XML |
| Esc | Cancel drawing / back to Select |

## Notes
- The browser console message "Download the React DevTools..." is informational and harmless. Install React DevTools extension for debugging.

## Development
See `docs/COMMANDS.md`, `docs/DATA_MODEL.md`, `docs/GEOMETRY.md`, and `docs/ROADMAP.md`.
