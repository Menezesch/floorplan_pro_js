# Data Model & XML Schema

Canonical storage uses **meters**.

## Entities
- `ProjectSettings`: defaults and coordinate controls.
  - `defaultWallThicknessM`, `defaultCeilingHeightM`, `gridSizeM`, `snapThresholdPx`, `planOrigin {x,y}`.
- `WallSegment`: `id`, `p1`, `p2`, `thicknessM`.
- `RectangleRoom`: `id`, `name`, `origin`, `widthM`, `heightM`, `classification`.
- `Obstacle`: currently rectangle polygon (`type="no_go"`), polygon-ready.
- `Opening`: `wallId`, `offsetAlongWallM`, `widthM`, `type(window|door)`.

## XML
```xml
<project version="1.1" units="m">
  <meta name="" created="" modified="" />
  <settings
    defaultWallThickness="0.15"
    defaultCeilingHeight="2.5"
    gridSize="0.05"
    snapThresholdPx="10"
    planOriginX="0"
    planOriginY="0" />
  <walls>
    <wall id="w1" thickness="0.15">
      <p1 x="0" y="0"/>
      <p2 x="4" y="0"/>
    </wall>
  </walls>
  <rooms>
    <room id="r1" name="Room 1" class="internal" x="0" y="0" width="4" height="3"/>
  </rooms>
  <obstacles>
    <obstacle id="o1" type="no_go"><polygon>...</polygon></obstacle>
  </obstacles>
  <openings>
    <opening id="op1" wallId="w1" offsetAlongWall="1.2" width="0.9" type="door"/>
  </openings>
</project>
```
