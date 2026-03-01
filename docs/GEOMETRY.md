# Geometry Notes

## Units Mapping
- Canonical world units: meters.
- Render mapping: `1 m = 100 SVG units` (1 unit = 1 cm).
- Conversions live in `src/geometry/units.ts`.

## ViewBox
- SVG viewport uses mutable `viewBox` for zoom/pan.
- Cursor world coordinates are derived from screen coordinates through SVG CTM inverse.

## Wall Offset
- MVP uses deterministic segment offset:
  - Given segment AB and thickness `t`, compute unit normal N.
  - Polygon is `[A+N*t/2, B+N*t/2, B-N*t/2, A-N*t/2]`.
- Tradeoff: no advanced polyline corner unions yet; maintainable foundation for phase-2 joins/booleans.

## Snapping
- Priority: vertex > edge > midpoint > grid fallback.
- Grid snap rounds to nearest grid step in meters.
- Angle snap hook is planned for shift-constrained drawing in next iteration.
