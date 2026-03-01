# Geometry Notes

## Units and Coordinates
- Canonical world units are meters.
- Render mapping is `1m = 100 SVG units`.
- Status bar shows:
  - World coordinates `(x,y)`.
  - Plan coordinates `(x - planOrigin.x, y - planOrigin.y)`.

## Stable SVG + Zoom
- Viewport uses a stable `viewBox`.
- Wheel zoom is handled with a **native** `wheel` listener registered with `{ passive: false }` to avoid passive-listener warnings while allowing `preventDefault()`.
- Cursor-anchored zoom keeps the same world point under the mouse when zooming.

## Walls
- MVP walls are single segments (`p1 -> p2`) with per-wall thickness.
- Rendering uses SVG `<line>` with `strokeWidth = thicknessM` converted to SVG units.
- This is deliberate for reliability and visibility; polygonal wall booleans are deferred.

## Snapping
- Default grid: `0.05m`.
- Magnetic priorities: vertex, then grid fallback.
- Snap threshold in project settings is pixel-based and converted to meters each frame.
- Snap indicator is rendered at the active snapped point.

## Rectangle detection
- Auto-room conversion checks the latest 4 wall segments:
  - closed rectangle (4 unique corners),
  - axis-aligned edges,
  - non-zero width/height.
- If valid, 4 walls are converted into one `RectangleRoom`.

## Dependencies choice
- Added `lucide-react` for consistent, lightweight tool iconography.
- No heavy CAD library introduced in this iteration to keep interactions deterministic and maintainable.
